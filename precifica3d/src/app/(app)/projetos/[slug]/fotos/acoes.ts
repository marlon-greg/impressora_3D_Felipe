"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/client";
import { exigirEdicao } from "@/server/workspace/contexto";
import { enviarFoto, apagarFoto } from "@/server/storage";
import type { EstadoForm } from "@/app/(auth)/estado";
import type { TipoFoto } from "@/generated/prisma/enums";

/** Confere que a peça é deste ateliê antes de qualquer escrita. */
async function peca(ws: string, slug: string) {
  return prisma.project.findFirst({ where: { workspaceId: ws, slug }, select: { id: true } });
}

export async function acaoEnviarFotos(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirEdicao();
  const slug = String(dados.get("slug") ?? "");
  const tipo = (String(dados.get("tipo") ?? "VENDA") as TipoFoto) satisfies TipoFoto;

  const p = await peca(c.ws, slug);
  if (!p) return { ok: false, mensagem: "Peça não encontrada." };

  const arquivos = dados.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (arquivos.length === 0) return { ok: false, mensagem: "Escolha ao menos uma imagem." };
  if (arquivos.length > 10) {
    return { ok: false, mensagem: "Envie até 10 fotos por vez para o upload não estourar o tempo." };
  }

  const ultima = await prisma.projectPhoto.findFirst({
    where: { projectId: p.id, tipo },
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });
  const existentes = await prisma.projectPhoto.count({ where: { projectId: p.id } });

  let ordem = (ultima?.ordem ?? -1) + 1;
  const falhas: string[] = [];
  let enviadas = 0;

  // uma a uma: um erro no meio não deve derrubar as que já subiram
  for (const arquivo of arquivos) {
    const r = await enviarFoto(arquivo, { workspaceId: c.ws, projectId: p.id });
    if (!r.ok) {
      falhas.push(r.erro);
      continue;
    }
    await prisma.projectPhoto.create({
      data: {
        projectId: p.id,
        tipo,
        url: r.arquivo.url,
        path: r.arquivo.path,
        bytes: r.arquivo.bytes,
        ordem: ordem++,
        // a primeira foto do projeto vira capa sozinha
        capa: existentes === 0 && enviadas === 0,
      },
    });
    enviadas++;
  }

  revalidatePath(`/projetos/${slug}`);
  revalidatePath(`/projetos/${slug}/fotos`);
  revalidatePath("/projetos");

  if (enviadas === 0) {
    return { ok: false, mensagem: falhas[0] ?? "Nenhuma foto foi enviada." };
  }
  return {
    ok: true,
    mensagem:
      falhas.length > 0
        ? `${enviadas} foto(s) enviadas. ${falhas.length} falharam: ${falhas[0]}`
        : `${enviadas} foto(s) enviadas.`,
  };
}

export async function acaoApagarFoto(dados: FormData): Promise<void> {
  const c = await exigirEdicao();
  const id = String(dados.get("id") ?? "");
  const slug = String(dados.get("slug") ?? "");

  const foto = await prisma.projectPhoto.findFirst({
    where: { id, project: { workspaceId: c.ws } },
  });
  if (!foto) return;

  await prisma.projectPhoto.delete({ where: { id } });
  await apagarFoto(foto.path);

  // capa apagada: promove a próxima, senão a peça fica sem miniatura na lista
  if (foto.capa) {
    const proxima = await prisma.projectPhoto.findFirst({
      where: { projectId: foto.projectId, tipo: "VENDA" },
      orderBy: { ordem: "asc" },
    });
    if (proxima) {
      await prisma.projectPhoto.update({ where: { id: proxima.id }, data: { capa: true } });
    }
  }

  revalidatePath(`/projetos/${slug}`);
  revalidatePath(`/projetos/${slug}/fotos`);
  revalidatePath("/projetos");
}

export async function acaoDefinirCapa(dados: FormData): Promise<void> {
  const c = await exigirEdicao();
  const id = String(dados.get("id") ?? "");
  const slug = String(dados.get("slug") ?? "");

  const foto = await prisma.projectPhoto.findFirst({
    where: { id, project: { workspaceId: c.ws } },
    select: { id: true, projectId: true },
  });
  if (!foto) return;

  await prisma.$transaction([
    prisma.projectPhoto.updateMany({ where: { projectId: foto.projectId }, data: { capa: false } }),
    prisma.projectPhoto.update({ where: { id: foto.id }, data: { capa: true } }),
  ]);

  revalidatePath(`/projetos/${slug}`);
  revalidatePath(`/projetos/${slug}/fotos`);
  revalidatePath("/projetos");
}

export async function acaoLegenda(_anterior: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const c = await exigirEdicao();
  const id = String(dados.get("id") ?? "");
  const slug = String(dados.get("slug") ?? "");
  const legenda = String(dados.get("legenda") ?? "").trim().slice(0, 200);

  const foto = await prisma.projectPhoto.findFirst({
    where: { id, project: { workspaceId: c.ws } },
    select: { id: true },
  });
  if (!foto) return { ok: false, mensagem: "Foto não encontrada." };

  await prisma.projectPhoto.update({
    where: { id },
    data: { legenda: legenda || null },
  });
  revalidatePath(`/projetos/${slug}/fotos`);
  return { ok: true, mensagem: "Legenda salva." };
}
