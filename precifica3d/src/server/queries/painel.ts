import "server-only";
import { prisma } from "@/server/db/client";
import { configuracao, tarifaKwh } from "@/server/workspace/contexto";
import { valoresAtuais, variacao } from "@/server/market/read";

/**
 * Tudo que o painel mostra, numa consulta só.
 *
 * As buscas independentes vão em paralelo: em série, cada ida ao Postgres do
 * Supabase custa uns 40 ms de latência, e oito delas somariam meio segundo de
 * tela branca.
 */
export async function dadosPainel(ws: string) {
  const [
    projetos,
    materiais,
    baixos,
    movimentacoes,
    recentes,
    alertas,
    impressoras,
    config,
    tarifa,
    estimados,
  ] = await Promise.all([
    prisma.project.groupBy({
      by: ["status"],
      where: { workspaceId: ws, arquivadoEm: null },
      _count: true,
    }),
    prisma.material.count({ where: { workspaceId: ws, ativo: true, arquivadoEm: null } }),
    // "abaixo do mínimo" não dá pra comparar coluna com coluna no Prisma,
    // então filtramos os que têm mínimo definido e conferimos na memória
    prisma.material.findMany({
      where: { workspaceId: ws, ativo: true, arquivadoEm: null, estoqueMinimo: { gt: 0 } },
      select: {
        id: true,
        nome: true,
        categoria: true,
        unidade: true,
        estoqueAtual: true,
        estoqueMinimo: true,
        cor: true,
        corHex: true,
      },
      orderBy: { nome: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { workspaceId: ws },
      orderBy: { criadoEm: "desc" },
      take: 8,
      include: { material: { select: { nome: true, unidade: true } } },
    }),
    prisma.project.findMany({
      where: { workspaceId: ws, arquivadoEm: null },
      orderBy: { atualizadoEm: "desc" },
      take: 6,
      select: {
        id: true,
        slug: true,
        nome: true,
        status: true,
        atualizadoEm: true,
        precoDefinido: true,
        horasImpressao: true,
        snapshots: {
          orderBy: { criadoEm: "desc" },
          take: 1,
          select: { precoIdeal: true, custoTotal: true, margemRealPct: true },
        },
        fotos: {
          where: { tipo: "VENDA" },
          orderBy: [{ capa: "desc" }, { ordem: "asc" }],
          take: 1,
          select: { url: true },
        },
      },
    }),
    prisma.alert.findMany({
      where: { workspaceId: ws, lidoEm: null },
      orderBy: [{ gravidade: "desc" }, { criadoEm: "desc" }],
      take: 6,
    }),
    prisma.printer.count({ where: { workspaceId: ws, ativa: true } }),
    configuracao(ws),
    tarifaKwh(ws),
    prisma.material.count({
      where: { workspaceId: ws, ativo: true, arquivadoEm: null, precoEstimado: true },
    }),
  ]);

  const [mercado, varDolar, varPetg] = await Promise.all([
    valoresAtuais(["USD-BRL", "IPCA", "PETG-MEDIA-KG", "PLA-MEDIA-KG"]),
    variacao("USD-BRL", 30),
    variacao("PETG-MEDIA-KG", 30),
  ]);

  const porStatus = Object.fromEntries(projetos.map((p) => [p.status, p._count]));

  return {
    projetos: {
      total: projetos.reduce((s, p) => s + p._count, 0),
      porStatus,
    },
    materiais: { total: materiais, estimados },
    estoqueBaixo: baixos.filter((m) => m.estoqueAtual <= m.estoqueMinimo),
    movimentacoes,
    recentes,
    alertas,
    mercado,
    varDolar,
    varPetg,
    // o que impede o cálculo de ser confiável — vira a lista de pendências
    pendencias: {
      semImpressora: impressoras === 0,
      semTarifa: tarifa === null,
      tarifaEstimada: tarifa?.estimado ?? false,
      semMaoDeObra: (await prisma.laborRate.count({ where: { workspaceId: ws, ativo: true } })) === 0,
      materiaisEstimados: estimados,
      margemPadraoPct: config.margemPadraoPct,
    },
  };
}
