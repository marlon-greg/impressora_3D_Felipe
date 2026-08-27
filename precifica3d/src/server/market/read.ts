import "server-only";
import { prisma } from "@/server/db/client";

/**
 * Leitura do cache de mercado. É por aqui que as telas consultam — sempre
 * do banco, nunca da internet.
 *
 * Todo valor vem acompanhado de quando foi coletado e se está vencido, para
 * a interface poder dizer "dólar de ontem" em vez de fingir que é ao vivo.
 * Dado velho apresentado como atual é pior que não ter dado.
 */

export interface ValorMercado {
  chave: string;
  valor: number;
  unidade: string | null;
  coletadoEm: Date;
  desatualizado: boolean;
  /** há quantas horas foi coletado */
  idadeHoras: number;
  meta: Record<string, unknown> | null;
}

const paraValor = (s: {
  chave: string;
  valor: number;
  unidade: string | null;
  coletadoEm: Date;
  expiraEm: Date;
  meta: unknown;
}): ValorMercado => ({
  chave: s.chave,
  valor: s.valor,
  unidade: s.unidade,
  coletadoEm: s.coletadoEm,
  desatualizado: s.expiraEm <= new Date(),
  idadeHoras: Math.round(((Date.now() - s.coletadoEm.getTime()) / 3600_000) * 10) / 10,
  meta: (s.meta as Record<string, unknown> | null) ?? null,
});

/** Último valor bom de uma chave, mesmo que já tenha vencido. */
export async function valorAtual(chave: string): Promise<ValorMercado | null> {
  const s = await prisma.marketSnapshot.findFirst({
    where: { chave, sucesso: true },
    orderBy: { coletadoEm: "desc" },
  });
  return s ? paraValor(s) : null;
}

export async function valoresAtuais(chaves: string[]): Promise<Record<string, ValorMercado>> {
  const registros = await prisma.marketSnapshot.findMany({
    where: { chave: { in: chaves }, sucesso: true },
    orderBy: { coletadoEm: "desc" },
    take: chaves.length * 8,
  });

  const mapa: Record<string, ValorMercado> = {};
  for (const r of registros) {
    if (!mapa[r.chave]) mapa[r.chave] = paraValor(r);
  }
  return mapa;
}

/** Série histórica para desenhar o gráfico de variação. */
export async function historico(chave: string, dias = 90) {
  const desde = new Date(Date.now() - dias * 24 * 3600_000);
  const registros = await prisma.marketSnapshot.findMany({
    where: { chave, sucesso: true, coletadoEm: { gte: desde } },
    orderBy: { coletadoEm: "asc" },
    select: { valor: true, coletadoEm: true },
  });

  // uma leitura por dia: várias coletas no mesmo dia poluem o gráfico
  const porDia = new Map<string, { valor: number; data: Date }>();
  for (const r of registros) {
    porDia.set(r.coletadoEm.toISOString().slice(0, 10), {
      valor: r.valor,
      data: r.coletadoEm,
    });
  }
  return [...porDia.entries()].map(([dia, v]) => ({ dia, ...v }));
}

export interface Variacao {
  atual: number;
  anterior: number;
  variacaoPct: number;
  dias: number;
  subiu: boolean;
}

/** Quanto uma chave variou nos últimos N dias. */
export async function variacao(chave: string, dias = 30): Promise<Variacao | null> {
  const agora = await valorAtual(chave);
  if (!agora) return null;

  const alvo = new Date(Date.now() - dias * 24 * 3600_000);
  const antigo = await prisma.marketSnapshot.findFirst({
    where: { chave, sucesso: true, coletadoEm: { lte: alvo } },
    orderBy: { coletadoEm: "desc" },
  });

  if (!antigo || antigo.valor === 0) return null;

  const pct = ((agora.valor - antigo.valor) / antigo.valor) * 100;
  return {
    atual: agora.valor,
    anterior: antigo.valor,
    variacaoPct: Math.round(pct * 100) / 100,
    dias,
    subiu: pct > 0,
  };
}

/** Contexto de mercado gravado junto do snapshot de precificação. */
export async function contextoMercado(): Promise<Record<string, unknown>> {
  const chaves = ["USD-BRL", "EUR-BRL", "IPCA", "PETG-MEDIA-KG", "PLA-MEDIA-KG"];
  const valores = await valoresAtuais(chaves);
  return Object.fromEntries(
    Object.entries(valores).map(([k, v]) => [
      k,
      { valor: v.valor, em: v.coletadoEm.toISOString(), desatualizado: v.desatualizado },
    ]),
  );
}

/** Preço de mercado por kg de um tipo de filamento, com as lojas amostradas. */
export async function precoMercadoFilamento(tipo: string) {
  const chave = `${tipo.toUpperCase()}-MEDIA-KG`;
  const [atual, var30] = await Promise.all([valorAtual(chave), variacao(chave, 30)]);
  if (!atual) return null;

  const meta = atual.meta as {
    amostras?: number;
    minimo?: number;
    maximo?: number;
    lojas?: string[];
  } | null;

  return {
    tipo: tipo.toUpperCase(),
    medianaPorKg: atual.valor,
    minimo: meta?.minimo ?? null,
    maximo: meta?.maximo ?? null,
    amostras: meta?.amostras ?? 0,
    lojas: meta?.lojas ?? [],
    coletadoEm: atual.coletadoEm,
    desatualizado: atual.desatualizado,
    variacao30d: var30,
  };
}

/** Estado da última coleta — alimenta a tela de diagnóstico. */
export async function estadoColetas() {
  const execucoes = await prisma.marketRun.findMany({
    orderBy: { iniciadoEm: "desc" },
    take: 30,
  });

  const porColetor = new Map<string, (typeof execucoes)[number]>();
  for (const e of execucoes) {
    if (!porColetor.has(e.coletor)) porColetor.set(e.coletor, e);
  }

  return [...porColetor.values()].map((e) => ({
    coletor: e.coletor,
    fonte: e.fonte,
    sucesso: e.sucesso,
    itens: e.itens,
    mensagem: e.mensagem,
    quando: e.iniciadoEm,
    idadeHoras: Math.round((Date.now() - e.iniciadoEm.getTime()) / 3600_000),
  }));
}
