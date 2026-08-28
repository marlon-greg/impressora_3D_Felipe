"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/server/db/client";
import { exigirEdicao } from "@/server/workspace/contexto";
import { catalogo } from "@/server/queries/projetos";
import { montarEntrada, gerarSlug, type Rascunho } from "@/core/pricing/montar";
import { precificar } from "@/core/pricing/calculator";
import { contextoMercado } from "@/server/market/read";
import type { EstadoForm } from "@/app/(auth)/estado";
import type { StatusProjeto } from "@/generated/prisma/enums";
import { esquema } from "./esquema";

/**
 * Ações da peça.
 *
 * O formulário manda o rascunho inteiro como JSON — ele tem listas que crescem
 * e encolhem (filamentos, materiais, trabalhos), e campos indexados no estilo
 * `filamentos[0][gramas]` seriam pior de validar do que um objeto só.
 *
 * O preço mostrado na tela é calculado no navegador para dar resposta
 * instantânea, mas quem grava é este arquivo: recalculamos aqui com o mesmo
 * motor e os preços do banco. Se alguém mexer no JSON pelo DevTools, o que
 * vale é este cálculo.
 */

/** Slug único dentro do ateliê: "suporte-fone", depois "suporte-fone-2"... */
async function slugLivre(ws: string, nome: string, exceto?: string): Promise<string> {
  const base = gerarSlug(nome);
  for (let i = 0; i < 50; i++) {
    const tentativa = i === 0 ? base : `${base}-${i + 1}`;
    const existe = await prisma.project.findFirst({
      where: { workspaceId: ws, slug: tentativa, ...(exceto ? { NOT: { id: exceto } } : {}) },
      select: { id: true },
    });
    if (!existe) return tentativa;
  }
  return `${base}-${Date.now()}`;
}

export async function acaoSalvarProjeto(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirEdicao();

  let bruto: unknown;
  try {
    bruto = JSON.parse(String(dados.get("rascunho") ?? "{}"));
  } catch {
    return { ok: false, mensagem: "Não consegui ler os dados do formulário. Recarregue a página." };
  }

  const p = esquema.safeParse(bruto);
  if (!p.success) {
    const primeiro = p.error.issues[0];
    return {
      ok: false,
      mensagem: `${primeiro.message} (campo: ${primeiro.path.join(".") || "geral"})`,
    };
  }

  const r = p.data as Rascunho;
  const id = String(dados.get("id") ?? "") || null;

  // recalcula no servidor com os preços do banco — a prévia do navegador
  // serviu para a pessoa decidir, não para virar registro
  const cat = await catalogo(c.ws);
  const resultado = precificar(montarEntrada(r, cat));
  const mercado = await contextoMercado();

  const slug = await slugLivre(c.ws, r.nome, id ?? undefined);

  const camposProjeto = {
    nome: r.nome,
    descricao: r.descricao || null,
    categoria: r.categoria || null,
    larguraMm: r.larguraMm,
    profundidadeMm: r.profundidadeMm,
    alturaMm: r.alturaMm,
    origemArquivo: r.origemArquivo,
    custoArquivo: r.custoArquivo,
    fonteArquivo: r.fonteArquivo || null,
    printerId: r.printerId,
    horasImpressao: r.horasImpressao,
    numeroPecas: r.numeroPecas,
    horasPreparo: r.horasPreparo,
    precisaSuporte: r.precisaSuporte,
    paredesFinas: r.paredesFinas,
    pecasMoveis: r.pecasMoveis,
    multiCor: r.multiCor,
    encaixePreciso: r.encaixePreciso,
    impressaoAlta: r.impressaoAlta,
    refugoManualPct: r.refugoManualPct,
    fazLixamento: r.fazLixamento,
    fazPrimer: r.fazPrimer,
    fazPintura: r.fazPintura,
    fazVerniz: r.fazVerniz,
    fazMontagem: r.fazMontagem,
    modoMargem: r.modoMargem,
    margemPct: r.margemPct,
    taxaCanalPct: r.taxaCanalPct,
    taxaPagamentoPct: r.taxaPagamentoPct,
    impostoPct: r.impostoPct,
    embalagemCusto: r.embalagemCusto,
    freteEmbutido: r.freteEmbutido,
    precoVendaAtual: r.precoVendaAtual,
    notas: r.notas || null,
  };

  const snapshot = {
    custoTotal: resultado.custoTotal,
    precoMinimo: resultado.faixas.minimo.preco,
    precoIdeal: resultado.faixas.ideal.preco,
    precoPremium: resultado.faixas.premium.preco,
    lucroIdeal: resultado.faixas.ideal.lucroLiquido,
    margemRealPct: resultado.faixas.ideal.margemRealPct,
    ganhoPorHoraMaquina: resultado.ganhoPorHoraMaquina,
    ganhoPorHoraHumana: resultado.ganhoPorHoraHumana,
    riscoScore: resultado.risco.score,
    detalhamento: resultado as unknown as object,
    contextoMercado: mercado as object,
  };

  const salvo = await prisma.$transaction(async (tx) => {
    const projeto = id
      ? await (async () => {
          const dono = await tx.project.findFirst({ where: { id, workspaceId: c.ws } });
          if (!dono) throw new Error("Peça não encontrada neste ateliê.");
          // as listas são substituídas por inteiro: casar linha a linha daria
          // muito trabalho para o mesmo resultado
          await tx.projectFilament.deleteMany({ where: { projectId: id } });
          await tx.projectMaterial.deleteMany({ where: { projectId: id } });
          await tx.projectLabor.deleteMany({ where: { projectId: id } });
          return tx.project.update({ where: { id }, data: { ...camposProjeto, slug } });
        })()
      : await tx.project.create({
          data: { ...camposProjeto, slug, workspaceId: c.ws },
        });

    for (const f of r.filamentos.filter((x) => x.gramas > 0)) {
      await tx.projectFilament.create({ data: { projectId: projeto.id, ...f } });
    }
    for (const m of r.materiais.filter((x) => x.quantidade > 0)) {
      await tx.projectMaterial.create({ data: { projectId: projeto.id, ...m } });
    }
    for (const t of r.trabalhos.filter((x) => x.horas > 0)) {
      await tx.projectLabor.create({
        data: {
          projectId: projeto.id,
          laborRateId: t.laborRateId,
          descricao: t.descricao || "Trabalho",
          horas: t.horas,
          valorHoraOverride: t.valorHora,
          antesDaImpressao: t.antesDaImpressao,
        },
      });
    }

    await tx.pricingSnapshot.create({ data: { projectId: projeto.id, ...snapshot } });

    return projeto;
  });

  revalidatePath("/projetos");
  revalidatePath("/painel");
  redirect(`/projetos/${salvo.slug}?${id ? "salvo" : "criado"}=1`);
}

// ── Definir o preço adotado ────────────────────────────────────

export async function acaoDefinirPreco(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirEdicao();
  const slug = String(dados.get("slug") ?? "");
  const valor = Number(String(dados.get("precoDefinido") ?? "").replace(",", "."));

  if (!Number.isFinite(valor) || valor < 0) {
    return { ok: false, mensagem: "Informe um preço válido." };
  }

  const p = await prisma.project.findFirst({ where: { workspaceId: c.ws, slug } });
  if (!p) return { ok: false, mensagem: "Peça não encontrada." };

  await prisma.project.update({ where: { id: p.id }, data: { precoDefinido: valor } });
  revalidatePath(`/projetos/${slug}`);
  return { ok: true, mensagem: "Preço adotado. É ele que aparece na lista de peças." };
}

// ── Mudar o status ─────────────────────────────────────────────

export async function acaoMudarStatus(dados: FormData): Promise<void> {
  const c = await exigirEdicao();
  const slug = String(dados.get("slug") ?? "");
  const status = String(dados.get("status") ?? "");

  const validos: StatusProjeto[] = ["RASCUNHO", "PRODUZIDO", "ANUNCIADO", "VENDIDO", "ARQUIVADO"];
  if (!validos.includes(status as StatusProjeto)) redirect(`/projetos/${slug}`);

  const p = await prisma.project.findFirst({ where: { workspaceId: c.ws, slug } });
  if (!p) redirect("/projetos");

  await prisma.project.update({
    where: { id: p.id },
    data: {
      status: status as StatusProjeto,
      arquivadoEm: status === "ARQUIVADO" ? new Date() : null,
    },
  });

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${slug}`);
  redirect(`/projetos/${slug}?status=1`);
}

// ── Produzi esta peça: dá baixa no estoque ─────────────────────

/**
 * O gesto que fecha o ciclo. Sem ele, o estoque só desce se ele lembrar de
 * abrir cada material e dar baixa à mão — e ninguém lembra.
 */
export async function acaoBaixarInsumos(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirEdicao();
  const slug = String(dados.get("slug") ?? "");

  const p = await prisma.project.findFirst({
    where: { workspaceId: c.ws, slug },
    include: { filamentos: true, materiais: true },
  });
  if (!p) return { ok: false, mensagem: "Peça não encontrada." };

  const consumo: { materialId: string; quantidade: number }[] = [
    ...p.filamentos.map((f) => ({
      materialId: f.materialId,
      quantidade: f.gramas * (1 + f.desperdicioPct / 100),
    })),
    ...p.materiais.map((m) => ({ materialId: m.materialId, quantidade: m.quantidade })),
  ];

  if (consumo.length === 0) {
    return { ok: false, mensagem: "Esta peça não tem material lançado — nada a baixar." };
  }

  const ids = consumo.map((x) => x.materialId);
  const materiais = await prisma.material.findMany({
    where: { id: { in: ids }, workspaceId: c.ws },
    select: { id: true, nome: true, estoqueAtual: true, unidade: true },
  });

  const faltando = consumo.filter((x) => {
    const m = materiais.find((y) => y.id === x.materialId);
    return !m || m.estoqueAtual < x.quantidade;
  });

  if (faltando.length > 0) {
    const nomes = faltando
      .map((f) => materiais.find((m) => m.id === f.materialId)?.nome ?? "material removido")
      .join(", ");
    return {
      ok: false,
      mensagem: `Não deu para baixar: falta estoque de ${nomes}. Reponha, ou corrija a contagem antes.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const x of consumo) {
      const m = materiais.find((y) => y.id === x.materialId)!;
      const saldo = m.estoqueAtual - x.quantidade;
      await tx.material.update({ where: { id: m.id }, data: { estoqueAtual: saldo } });
      await tx.stockMovement.create({
        data: {
          workspaceId: c.ws,
          materialId: m.id,
          tipo: "SAIDA",
          quantidade: x.quantidade,
          saldoApos: saldo,
          motivo: `produção: ${p.nome}`,
          projectId: p.id,
          usuarioId: c.id,
        },
      });
    }
    if (p.status === "RASCUNHO") {
      await tx.project.update({ where: { id: p.id }, data: { status: "PRODUZIDO" } });
    }
  });

  revalidatePath("/materiais");
  revalidatePath("/painel");
  revalidatePath(`/projetos/${slug}`);

  return {
    ok: true,
    mensagem: `Baixa registrada em ${consumo.length} ${consumo.length > 1 ? "materiais" : "material"}. O extrato de cada um mostra esta peça como motivo.`,
  };
}
