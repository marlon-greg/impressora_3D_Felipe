import "server-only";
import { prisma } from "@/server/db/client";
import { configuracao, tarifaKwh } from "@/server/workspace/contexto";
import type { Catalogo, Rascunho } from "@/core/pricing/montar";
import type { Unidade, ModoMargem } from "@/core/pricing/calculator";

/**
 * O catálogo que o formulário de peça precisa: materiais, impressoras,
 * valor-hora e os padrões comerciais do ateliê.
 *
 * Vai inteiro para o navegador, e é de propósito: com ele em mãos o cálculo
 * roda enquanto a pessoa digita, sem uma ida ao servidor por tecla. São
 * algumas dezenas de linhas — cabe folgado no payload.
 */
export async function catalogo(ws: string): Promise<Catalogo> {
  const [materiais, impressoras, maoDeObra, config, tarifa] = await Promise.all([
    prisma.material.findMany({
      where: { workspaceId: ws, ativo: true, arquivadoEm: null },
      orderBy: [{ categoria: "asc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        categoria: true,
        unidade: true,
        precoEmbalagem: true,
        tamanhoEmbalagem: true,
        rendimentoPecas: true,
        precoEstimado: true,
        cor: true,
        corHex: true,
        estoqueAtual: true,
      },
    }),
    prisma.printer.findMany({
      where: { workspaceId: ws, ativa: true },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        valorPago: true,
        vidaUtilHoras: true,
        manutencaoAnual: true,
        horasUsoAnual: true,
        potenciaWatts: true,
      },
    }),
    prisma.laborRate.findMany({
      where: { workspaceId: ws, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, valorHora: true },
    }),
    configuracao(ws),
    tarifaKwh(ws),
  ]);

  return {
    materiais: materiais.map((m) => ({ ...m, unidade: m.unidade as Unidade })),
    impressoras,
    maoDeObra,
    tarifaKwh: tarifa?.valor ?? 0,
    padroes: {
      modoMargem: config.modoMargem as ModoMargem,
      margemPadraoPct: config.margemPadraoPct,
      taxaCanalPadraoPct: config.taxaCanalPadraoPct,
      taxaPagamentoPct: config.taxaPagamentoPct,
      impostoPct: config.impostoPct,
      custoIndiretoMensal: config.custoIndiretoMensal,
      horasProdutivasMes: config.horasProdutivasMes,
      embalagemPadrao: config.embalagemPadrao,
    },
  };
}

/** Projeto do banco convertido para o formato do formulário. */
export async function rascunhoDe(ws: string, slug: string): Promise<(Rascunho & { id: string; slug: string; status: string }) | null> {
  const p = await prisma.project.findFirst({
    where: { workspaceId: ws, slug },
    include: {
      filamentos: true,
      materiais: true,
      trabalhos: { include: { laborRate: { select: { valorHora: true } } } },
    },
  });
  if (!p) return null;

  return {
    id: p.id,
    slug: p.slug,
    status: p.status,
    nome: p.nome,
    descricao: p.descricao ?? "",
    categoria: p.categoria ?? "",
    larguraMm: p.larguraMm,
    profundidadeMm: p.profundidadeMm,
    alturaMm: p.alturaMm,
    origemArquivo: p.origemArquivo,
    custoArquivo: p.custoArquivo,
    fonteArquivo: p.fonteArquivo ?? "",
    printerId: p.printerId,
    horasImpressao: p.horasImpressao,
    numeroPecas: p.numeroPecas,
    horasPreparo: p.horasPreparo,
    filamentos: p.filamentos.map((f) => ({
      materialId: f.materialId,
      gramas: f.gramas,
      desperdicioPct: f.desperdicioPct,
    })),
    materiais: p.materiais.map((m) => ({
      materialId: m.materialId,
      quantidade: m.quantidade,
    })),
    trabalhos: p.trabalhos.map((t) => ({
      laborRateId: t.laborRateId,
      descricao: t.descricao,
      horas: t.horas,
      valorHora: t.valorHoraOverride ?? t.laborRate?.valorHora ?? 0,
      antesDaImpressao: t.antesDaImpressao,
    })),
    precisaSuporte: p.precisaSuporte,
    paredesFinas: p.paredesFinas,
    pecasMoveis: p.pecasMoveis,
    multiCor: p.multiCor,
    encaixePreciso: p.encaixePreciso,
    impressaoAlta: p.impressaoAlta,
    refugoManualPct: p.refugoManualPct,
    fazLixamento: p.fazLixamento,
    fazPrimer: p.fazPrimer,
    fazPintura: p.fazPintura,
    fazVerniz: p.fazVerniz,
    fazMontagem: p.fazMontagem,
    // null nos campos comerciais significa "herda do ateliê" — resolvemos aqui
    // para o formulário não precisar saber dessa regra
    modoMargem: (p.modoMargem ?? "MARKUP") as ModoMargem,
    margemPct: p.margemPct ?? 0,
    taxaCanalPct: p.taxaCanalPct ?? 0,
    taxaPagamentoPct: p.taxaPagamentoPct ?? 0,
    impostoPct: p.impostoPct ?? 0,
    embalagemCusto: p.embalagemCusto,
    freteEmbutido: p.freteEmbutido,
    precoVendaAtual: p.precoVendaAtual,
    notas: p.notas ?? "",
  };
}

/** Preenche os campos comerciais herdados do ateliê quando o projeto não os define. */
export function comHerancaComercial(r: Rascunho, cat: Catalogo, p: {
  modoMargem: string | null;
  margemPct: number | null;
  taxaCanalPct: number | null;
  taxaPagamentoPct: number | null;
  impostoPct: number | null;
}): Rascunho {
  return {
    ...r,
    modoMargem: (p.modoMargem ?? cat.padroes.modoMargem) as ModoMargem,
    margemPct: p.margemPct ?? cat.padroes.margemPadraoPct,
    taxaCanalPct: p.taxaCanalPct ?? cat.padroes.taxaCanalPadraoPct,
    taxaPagamentoPct: p.taxaPagamentoPct ?? cat.padroes.taxaPagamentoPct,
    impostoPct: p.impostoPct ?? cat.padroes.impostoPct,
  };
}
