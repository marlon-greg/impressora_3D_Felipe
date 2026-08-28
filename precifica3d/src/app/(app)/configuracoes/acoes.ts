"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db/client";
import { exigirAdmin, exigirEdicao } from "@/server/workspace/contexto";
import { convidar } from "@/server/auth/service";
import type { EstadoForm } from "@/app/(auth)/estado";
import type { Papel } from "@/generated/prisma/enums";

/**
 * Ajustes do ateliê.
 *
 * Quase tudo aqui muda o custo de TODA peça futura — por isso exige papel de
 * admin, e por isso cada tela explica em texto o que o número significa.
 * Ninguém acerta "horas produtivas por mês" sem entender para que serve.
 */

/** Vírgula decimal é como se digita em português; o input aceita as duas. */
const n = (v: FormDataEntryValue | null, padrao = 0): number => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return padrao;
  const x = Number(s);
  return Number.isFinite(x) ? x : padrao;
};

const t = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

function erroZod(e: z.ZodError): EstadoForm {
  const campos: Record<string, string> = {};
  for (const i of e.issues) {
    const campo = String(i.path[0] ?? "geral");
    if (!campos[campo]) campos[campo] = i.message;
  }
  return { ok: false, mensagem: "Confira os campos destacados.", campos };
}

// ══════════════════════════════════════════════════════════════
// MARGEM, TAXAS E CUSTO INDIRETO
// ══════════════════════════════════════════════════════════════

export async function acaoSalvarMargem(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirAdmin();

  const esquema = z.object({
    negocioNome: z.string().trim().min(1, "Dê um nome ao ateliê.").max(80),
    modoMargem: z.enum(["MARKUP", "MARGEM_LIQUIDA"]),
    margemPadraoPct: z.number().min(0, "Não pode ser negativa.").max(1000),
    taxaCanalPadraoPct: z.number().min(0).max(99, "Taxa de 100% deixaria o preço infinito."),
    taxaPagamentoPct: z.number().min(0).max(99),
    impostoPct: z.number().min(0).max(99),
    custoIndiretoMensal: z.number().min(0),
    horasProdutivasMes: z.number().positive("Precisa ser maior que zero — é um divisor."),
    embalagemPadrao: z.number().min(0),
  });

  const p = esquema.safeParse({
    negocioNome: dados.get("negocioNome"),
    modoMargem: dados.get("modoMargem"),
    margemPadraoPct: n(dados.get("margemPadraoPct")),
    taxaCanalPadraoPct: n(dados.get("taxaCanalPadraoPct")),
    taxaPagamentoPct: n(dados.get("taxaPagamentoPct")),
    impostoPct: n(dados.get("impostoPct")),
    custoIndiretoMensal: n(dados.get("custoIndiretoMensal")),
    horasProdutivasMes: n(dados.get("horasProdutivasMes"), 80),
    embalagemPadrao: n(dados.get("embalagemPadrao")),
  });
  if (!p.success) return erroZod(p.error);

  await prisma.settings.upsert({
    where: { workspaceId: c.ws },
    create: { workspaceId: c.ws, ...p.data },
    update: p.data,
  });

  revalidatePath("/configuracoes/margem");
  revalidatePath("/painel");
  return {
    ok: true,
    mensagem:
      "Salvo. Estes valores viram o ponto de partida das próximas peças — as já calculadas guardam o que valia no dia delas.",
  };
}

// ══════════════════════════════════════════════════════════════
// IMPRESSORAS
// ══════════════════════════════════════════════════════════════

export async function acaoSalvarImpressora(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirEdicao();

  const esquema = z.object({
    nome: z.string().trim().min(2, "Dê um nome à impressora."),
    valorPago: z.number().min(0, "Não pode ser negativo."),
    vidaUtilHoras: z.number().positive("Precisa ser maior que zero — é um divisor."),
    manutencaoAnual: z.number().min(0),
    horasUsoAnual: z.number().positive("Precisa ser maior que zero — é um divisor."),
    potenciaWatts: z.number().min(0),
  });

  const p = esquema.safeParse({
    nome: dados.get("nome"),
    valorPago: n(dados.get("valorPago")),
    vidaUtilHoras: n(dados.get("vidaUtilHoras"), 6000),
    manutencaoAnual: n(dados.get("manutencaoAnual")),
    horasUsoAnual: n(dados.get("horasUsoAnual"), 1000),
    potenciaWatts: n(dados.get("potenciaWatts"), 150),
  });
  if (!p.success) return erroZod(p.error);

  const id = t(dados.get("id"));
  const extras = {
    marca: t(dados.get("marca")),
    modelo: t(dados.get("modelo")),
    tecnologia: (String(dados.get("tecnologia") ?? "FDM") === "RESINA" ? "RESINA" : "FDM") as
      | "FDM"
      | "RESINA",
    volumeX: t(dados.get("volumeX")) ? n(dados.get("volumeX")) : null,
    volumeY: t(dados.get("volumeY")) ? n(dados.get("volumeY")) : null,
    volumeZ: t(dados.get("volumeZ")) ? n(dados.get("volumeZ")) : null,
    bicoMm: t(dados.get("bicoMm")) ? n(dados.get("bicoMm")) : null,
    notas: t(dados.get("notas")),
    // preencheu os dados de verdade? o selo de estimativa cai
    camposEstimados: [] as string[],
  };

  if (id) {
    const dono = await prisma.printer.findFirst({ where: { id, workspaceId: c.ws } });
    if (!dono) return { ok: false, mensagem: "Impressora não encontrada neste ateliê." };
    await prisma.printer.update({ where: { id }, data: { ...p.data, ...extras } });
  } else {
    await prisma.printer.create({ data: { ...p.data, ...extras, workspaceId: c.ws } });
  }

  revalidatePath("/configuracoes/impressoras");
  revalidatePath("/painel");
  return { ok: true, mensagem: id ? "Impressora atualizada." : "Impressora cadastrada." };
}

export async function acaoRemoverImpressora(dados: FormData): Promise<void> {
  const c = await exigirEdicao();
  const id = String(dados.get("id") ?? "");

  const p = await prisma.printer.findFirst({ where: { id, workspaceId: c.ws } });
  if (!p) return;

  // desativa em vez de apagar: peças antigas apontam para ela, e o custo
  // daquelas peças precisa continuar explicável
  await prisma.printer.update({ where: { id }, data: { ativa: !p.ativa } });
  revalidatePath("/configuracoes/impressoras");
}

// ══════════════════════════════════════════════════════════════
// ENERGIA
// ══════════════════════════════════════════════════════════════

export async function acaoSalvarTarifa(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirEdicao();

  const esquema = z.object({
    referencia: z.string().trim().min(3, "Diga de que mês é a conta."),
    valorConta: z.number().positive("Informe o valor total da conta."),
    consumoKwh: z.number().positive("Informe o consumo em kWh que veio na conta."),
  });

  const p = esquema.safeParse({
    referencia: dados.get("referencia"),
    valorConta: n(dados.get("valorConta")),
    consumoKwh: n(dados.get("consumoKwh")),
  });
  if (!p.success) return erroZod(p.error);

  const bandeira = String(dados.get("bandeira") ?? "VERDE");
  const bandeiras = ["VERDE", "AMARELA", "VERMELHA_1", "VERMELHA_2"];

  await prisma.$transaction([
    // só uma tarifa ativa por vez: o cálculo precisa de um R$/kWh, não de vários
    prisma.energyTariff.updateMany({ where: { workspaceId: c.ws }, data: { ativa: false } }),
    prisma.energyTariff.create({
      data: {
        workspaceId: c.ws,
        ...p.data,
        distribuidora: t(dados.get("distribuidora")),
        bandeira: (bandeiras.includes(bandeira) ? bandeira : "VERDE") as "VERDE",
        ativa: true,
        estimado: false,
      },
    }),
  ]);

  revalidatePath("/configuracoes/energia");
  revalidatePath("/painel");

  const kwh = p.data.valorConta / p.data.consumoKwh;
  return {
    ok: true,
    mensagem: `Conta lançada. Seu quilowatt-hora real é R$ ${kwh.toFixed(3).replace(".", ",")} — bem acima da tarifa de tabela, porque já embute impostos e bandeira.`,
  };
}

export async function acaoAtivarTarifa(dados: FormData): Promise<void> {
  const c = await exigirEdicao();
  const id = String(dados.get("id") ?? "");

  const tarifa = await prisma.energyTariff.findFirst({ where: { id, workspaceId: c.ws } });
  if (!tarifa) return;

  await prisma.$transaction([
    prisma.energyTariff.updateMany({ where: { workspaceId: c.ws }, data: { ativa: false } }),
    prisma.energyTariff.update({ where: { id }, data: { ativa: true } }),
  ]);
  revalidatePath("/configuracoes/energia");
  revalidatePath("/painel");
}

// ══════════════════════════════════════════════════════════════
// MÃO DE OBRA
// ══════════════════════════════════════════════════════════════

export async function acaoSalvarMaoDeObra(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirEdicao();

  const esquema = z.object({
    nome: z.string().trim().min(2, "Dê um nome ao tipo de trabalho."),
    valorHora: z.number().min(0, "Não pode ser negativo."),
  });

  const p = esquema.safeParse({
    nome: dados.get("nome"),
    valorHora: n(dados.get("valorHora")),
  });
  if (!p.success) return erroZod(p.error);

  const id = t(dados.get("id"));
  if (id) {
    const dono = await prisma.laborRate.findFirst({ where: { id, workspaceId: c.ws } });
    if (!dono) return { ok: false, mensagem: "Item não encontrado neste ateliê." };
    await prisma.laborRate.update({ where: { id }, data: p.data });
  } else {
    await prisma.laborRate.create({ data: { ...p.data, workspaceId: c.ws } });
  }

  revalidatePath("/configuracoes/mao-de-obra");
  return { ok: true, mensagem: "Salvo." };
}

export async function acaoRemoverMaoDeObra(dados: FormData): Promise<void> {
  const c = await exigirEdicao();
  const id = String(dados.get("id") ?? "");
  const item = await prisma.laborRate.findFirst({ where: { id, workspaceId: c.ws } });
  if (!item) return;
  await prisma.laborRate.update({ where: { id }, data: { ativo: !item.ativo } });
  revalidatePath("/configuracoes/mao-de-obra");
}

// ══════════════════════════════════════════════════════════════
// EQUIPE
// ══════════════════════════════════════════════════════════════

export async function acaoConvidar(_anterior: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const c = await exigirAdmin();

  const esquema = z.object({
    nome: z.string().trim().min(2, "Informe o nome de quem você está convidando."),
    email: z.string().trim().email("E-mail inválido."),
    papel: z.enum(["ADMIN", "OPERADOR", "LEITOR"]),
  });

  const p = esquema.safeParse({
    nome: dados.get("nome"),
    email: dados.get("email"),
    papel: dados.get("papel"),
  });
  if (!p.success) return erroZod(p.error);

  const r = await convidar({
    nome: p.data.nome,
    email: p.data.email,
    workspaceId: c.ws,
    papel: p.data.papel as Papel,
    convidadoPor: c.nome,
  });

  revalidatePath("/configuracoes/equipe");
  return { ok: r.ok, mensagem: r.mensagem, campos: r.campos, linkDev: r.dados?.link };
}

export async function acaoMudarPapel(dados: FormData): Promise<void> {
  const c = await exigirAdmin();
  const membroId = String(dados.get("membroId") ?? "");
  const papel = String(dados.get("papel") ?? "");

  if (!["ADMIN", "OPERADOR", "LEITOR"].includes(papel)) return;

  const membro = await prisma.membership.findFirst({
    where: { id: membroId, workspaceId: c.ws },
  });
  // o DONO não é rebaixável por ninguém, nem por outro admin: sem isso o
  // ateliê pode ficar sem dono e sem quem consiga devolver o acesso
  if (!membro || membro.papel === "DONO") return;

  await prisma.membership.update({ where: { id: membroId }, data: { papel: papel as Papel } });
  revalidatePath("/configuracoes/equipe");
}

export async function acaoRemoverMembro(dados: FormData): Promise<void> {
  const c = await exigirAdmin();
  const membroId = String(dados.get("membroId") ?? "");

  const membro = await prisma.membership.findFirst({
    where: { id: membroId, workspaceId: c.ws },
  });
  if (!membro || membro.papel === "DONO" || membro.userId === c.id) return;

  await prisma.membership.delete({ where: { id: membroId } });
  revalidatePath("/configuracoes/equipe");
}
