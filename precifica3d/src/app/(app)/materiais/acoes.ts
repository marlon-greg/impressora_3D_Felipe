"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/server/db/client";
import { exigirEdicao } from "@/server/workspace/contexto";
import type { EstadoForm } from "@/app/(auth)/estado";

/**
 * Ações de material e estoque.
 *
 * Duas regras que valem para todas:
 *   1. o `workspaceId` vem da sessão, NUNCA do formulário — senão bastaria
 *      editar o HTML para mexer no estoque de outro ateliê;
 *   2. estoque só muda por movimentação, e na mesma transação que grava o
 *      saldo. Assim o extrato sempre fecha com o número exibido.
 */

const numero = (msg: string) =>
  z.coerce.number({ message: msg }).refine((n) => Number.isFinite(n), msg);

const opcional = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

const opcionalNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function erroZod(e: z.ZodError): EstadoForm {
  const campos: Record<string, string> = {};
  for (const i of e.issues) {
    const campo = String(i.path[0] ?? "geral");
    if (!campos[campo]) campos[campo] = i.message;
  }
  return { ok: false, mensagem: "Confira os campos destacados.", campos };
}

// ── Criar / editar ─────────────────────────────────────────────

const esquema = z.object({
  nome: z.string().trim().min(2, "Dê um nome que você reconheça na prateleira."),
  categoria: z.enum([
    "FILAMENTO", "TINTA", "PRIMER", "VERNIZ", "MASSA", "COLA",
    "ABRASIVO", "PINCEL", "FERRAGEM", "EMBALAGEM", "OUTRO",
  ]),
  unidade: z.enum(["G", "ML", "UN"]),
  tamanhoEmbalagem: numero("Informe o tamanho da embalagem.").positive(
    "O tamanho da embalagem precisa ser maior que zero.",
  ),
  precoEmbalagem: numero("Informe quanto você pagou.").min(0, "O preço não pode ser negativo."),
  estoqueMinimo: numero("Valor inválido.").min(0, "O mínimo não pode ser negativo."),
});

export async function acaoSalvarMaterial(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirEdicao();

  const p = esquema.safeParse({
    nome: dados.get("nome"),
    categoria: dados.get("categoria"),
    unidade: dados.get("unidade"),
    tamanhoEmbalagem: String(dados.get("tamanhoEmbalagem") ?? "").replace(",", "."),
    precoEmbalagem: String(dados.get("precoEmbalagem") ?? "").replace(",", "."),
    estoqueMinimo: String(dados.get("estoqueMinimo") ?? "0").replace(",", ".") || "0",
  });
  if (!p.success) return erroZod(p.error);

  const id = opcional(dados.get("id"));
  const estoqueInicial = opcionalNum(dados.get("estoqueInicial")) ?? 0;

  const comuns = {
    ...p.data,
    marca: opcional(dados.get("marca")),
    tipoMaterial: opcional(dados.get("tipoMaterial")),
    cor: opcional(dados.get("cor")),
    corHex: opcional(dados.get("corHex")),
    fornecedor: opcional(dados.get("fornecedor")),
    notas: opcional(dados.get("notas")),
    rendimentoPecas: opcionalNum(dados.get("rendimentoPecas")),
    diametroMm: opcionalNum(dados.get("diametroMm")),
    densidadeGcm3: opcionalNum(dados.get("densidadeGcm3")),
    tempBico: opcionalNum(dados.get("tempBico")),
    tempMesa: opcionalNum(dados.get("tempMesa")),
    // quem edita e informa o preço está confirmando: o selo "estimado" cai
    precoEstimado: dados.get("precoEstimado") === "on",
  };

  if (id) {
    const existente = await prisma.material.findFirst({
      where: { id, workspaceId: c.ws },
      select: { id: true, precoEmbalagem: true, tamanhoEmbalagem: true },
    });
    if (!existente) return { ok: false, mensagem: "Material não encontrado neste ateliê." };

    // preço mudou: guarda a compra para alimentar o histórico de variação
    const mudouPreco =
      existente.precoEmbalagem !== p.data.precoEmbalagem ||
      existente.tamanhoEmbalagem !== p.data.tamanhoEmbalagem;

    await prisma.$transaction(async (tx) => {
      await tx.material.update({
        where: { id },
        data: {
          ...comuns,
          tempBico: comuns.tempBico != null ? Math.round(comuns.tempBico) : null,
          tempMesa: comuns.tempMesa != null ? Math.round(comuns.tempMesa) : null,
        },
      });
      if (mudouPreco) {
        await tx.materialPurchase.create({
          data: {
            materialId: id,
            precoEmbalagem: p.data.precoEmbalagem,
            tamanhoEmbalagem: p.data.tamanhoEmbalagem,
            fornecedor: comuns.fornecedor,
            notas: "preço atualizado na edição",
          },
        });
      }
    });

    revalidatePath("/materiais");
    revalidatePath(`/materiais/${id}`);
    redirect(`/materiais/${id}?salvo=1`);
  }

  const criado = await prisma.$transaction(async (tx) => {
    const m = await tx.material.create({
      data: {
        ...comuns,
        tempBico: comuns.tempBico != null ? Math.round(comuns.tempBico) : null,
        tempMesa: comuns.tempMesa != null ? Math.round(comuns.tempMesa) : null,
        workspaceId: c.ws,
        estoqueAtual: 0,
      },
    });

    await tx.materialPurchase.create({
      data: {
        materialId: m.id,
        precoEmbalagem: p.data.precoEmbalagem,
        tamanhoEmbalagem: p.data.tamanhoEmbalagem,
        fornecedor: comuns.fornecedor,
        notas: "cadastro inicial",
      },
    });

    if (estoqueInicial > 0) {
      await tx.material.update({
        where: { id: m.id },
        data: { estoqueAtual: estoqueInicial },
      });
      await tx.stockMovement.create({
        data: {
          workspaceId: c.ws,
          materialId: m.id,
          tipo: "ENTRADA",
          quantidade: estoqueInicial,
          saldoApos: estoqueInicial,
          motivo: "estoque inicial do cadastro",
          usuarioId: c.id,
        },
      });
    }

    return m;
  });

  revalidatePath("/materiais");
  redirect(`/materiais/${criado.id}?criado=1`);
}

// ── Movimentar estoque ─────────────────────────────────────────

const esquemaMov = z.object({
  materialId: z.string().min(1),
  tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantidade: numero("Informe a quantidade.").positive("A quantidade precisa ser maior que zero."),
});

export async function acaoMovimentar(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirEdicao();

  const p = esquemaMov.safeParse({
    materialId: dados.get("materialId"),
    tipo: dados.get("tipo"),
    quantidade: String(dados.get("quantidade") ?? "").replace(",", "."),
  });
  if (!p.success) return erroZod(p.error);

  const material = await prisma.material.findFirst({
    where: { id: p.data.materialId, workspaceId: c.ws },
    select: { id: true, estoqueAtual: true, nome: true },
  });
  if (!material) return { ok: false, mensagem: "Material não encontrado neste ateliê." };

  // AJUSTE é contagem física: a quantidade É o novo saldo, não um delta
  const saldoApos =
    p.data.tipo === "ENTRADA"
      ? material.estoqueAtual + p.data.quantidade
      : p.data.tipo === "SAIDA"
        ? material.estoqueAtual - p.data.quantidade
        : p.data.quantidade;

  if (saldoApos < 0) {
    return {
      ok: false,
      mensagem: `Você tem ${material.estoqueAtual} em estoque e tentou dar baixa de ${p.data.quantidade}. Se sobrou menos do que o sistema achava, use "corrigir contagem".`,
      campos: { quantidade: "Maior que o saldo." },
    };
  }

  await prisma.$transaction([
    prisma.material.update({
      where: { id: material.id },
      data: { estoqueAtual: saldoApos },
    }),
    prisma.stockMovement.create({
      data: {
        workspaceId: c.ws,
        materialId: material.id,
        tipo: p.data.tipo,
        quantidade: p.data.quantidade,
        saldoApos,
        motivo: opcional(dados.get("motivo")),
        usuarioId: c.id,
      },
    }),
  ]);

  revalidatePath("/materiais");
  revalidatePath(`/materiais/${material.id}`);
  revalidatePath("/painel");

  const verbo =
    p.data.tipo === "ENTRADA" ? "Entrada registrada" : p.data.tipo === "SAIDA" ? "Baixa registrada" : "Contagem corrigida";
  return { ok: true, mensagem: `${verbo}. Saldo agora: ${saldoApos}.` };
}

// ── Arquivar ───────────────────────────────────────────────────

export async function acaoArquivarMaterial(dados: FormData): Promise<void> {
  const c = await exigirEdicao();
  const id = String(dados.get("id") ?? "");

  const m = await prisma.material.findFirst({ where: { id, workspaceId: c.ws } });
  if (!m) redirect("/materiais");

  // arquivar, nunca apagar: o material aparece em projetos antigos e apagá-lo
  // apagaria o custo daquelas peças junto
  await prisma.material.update({
    where: { id },
    data: { arquivadoEm: m.arquivadoEm ? null : new Date(), ativo: !!m.arquivadoEm },
  });

  revalidatePath("/materiais");
  redirect(m.arquivadoEm ? `/materiais/${id}?restaurado=1` : "/materiais?arquivado=1");
}
