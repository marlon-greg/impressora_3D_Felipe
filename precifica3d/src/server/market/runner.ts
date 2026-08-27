import "server-only";
import { prisma } from "@/server/db/client";
import type { Coletor } from "./types";
import { coletorCambio } from "./providers/cambio";
import { coletorIndices } from "./providers/indices";
import { coletorLojas } from "./providers/lojas";
import { coletorMarketplace } from "./providers/marketplace";

/**
 * Orquestra a coleta e grava tudo no banco.
 *
 * Princípio: NENHUMA tela do app chama API externa. Este executor roda
 * agendado (1×/dia, que é o teto do plano Hobby da Vercel) ou por botão, e o
 * app inteiro lê só do que ficou gravado.
 *
 * Consequências práticas:
 *   • a tela abre instantâneo, sem esperar rede
 *   • internet fora ou site mudou de layout não quebra nada
 *   • o último valor bom continua servindo, marcado como desatualizado
 */

export const COLETORES: Coletor[] = [
  coletorCambio,
  coletorIndices,
  coletorLojas,
  coletorMarketplace,
];

export interface ResultadoExecucao {
  coletor: string;
  nome: string;
  status: "OK" | "CACHE" | "PULADO" | "FALHOU";
  itens: number;
  mensagem?: string;
  duracaoMs: number;
}

/** Ainda existe leitura válida em cache para este coletor? */
async function temCacheValido(c: Coletor): Promise<boolean> {
  const recente = await prisma.marketSnapshot.findFirst({
    where: { fonte: c.fonte, sucesso: true, expiraEm: { gt: new Date() } },
    orderBy: { coletadoEm: "desc" },
  });
  return recente !== null;
}

async function executarUm(c: Coletor, forcar: boolean): Promise<ResultadoExecucao> {
  const inicio = Date.now();
  const base = { coletor: c.id, nome: c.nome };

  const motivo = c.indisponivel?.();
  if (motivo) {
    return { ...base, status: "PULADO", itens: 0, mensagem: motivo, duracaoMs: 0 };
  }

  if (!forcar && (await temCacheValido(c))) {
    return {
      ...base,
      status: "CACHE",
      itens: 0,
      mensagem: "Ainda dentro da validade, não precisei buscar.",
      duracaoMs: Date.now() - inicio,
    };
  }

  const execucao = await prisma.marketRun.create({
    data: { fonte: c.fonte, coletor: c.id },
  });

  try {
    const r = await c.coletar();
    const expiraEm = new Date(Date.now() + c.validadeHoras * 3600_000);
    let itens = 0;

    if (r.pontos?.length) {
      await prisma.marketSnapshot.createMany({
        data: r.pontos.map((p) => ({
          fonte: c.fonte,
          chave: p.chave,
          valor: p.valor,
          unidade: p.unidade,
          meta: (p.meta ?? undefined) as never,
          expiraEm,
          sucesso: true,
        })),
      });
      itens += r.pontos.length;
    }

    if (r.insumos?.length) {
      await prisma.marketMaterialPrice.createMany({
        data: r.insumos.map((i) => ({
          loja: i.loja,
          produto: i.produto,
          tipoMaterial: i.tipoMaterial,
          marca: i.marca,
          precoBRL: i.precoBRL,
          pesoKg: i.pesoKg,
          precoPorKg: i.precoPorKg ?? i.precoBRL / i.pesoKg,
          url: i.url,
          disponivel: i.disponivel ?? true,
        })),
      });
      itens += r.insumos.length;
    }

    if (r.anuncios?.length) {
      await prisma.marketListingStat.createMany({
        data: r.anuncios.map((a) => ({
          termo: a.termo,
          precoMin: a.precoMin,
          precoMedio: a.precoMedio,
          precoMax: a.precoMax,
          precoMediana: a.precoMediana,
          amostras: a.amostras,
        })),
      });
      itens += r.anuncios.length;
    }

    await prisma.marketRun.update({
      where: { id: execucao.id },
      data: { concluidoEm: new Date(), sucesso: true, itens },
    });

    return { ...base, status: "OK", itens, duracaoMs: Date.now() - inicio };
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);

    await prisma.marketRun.update({
      where: { id: execucao.id },
      data: { concluidoEm: new Date(), sucesso: false, mensagem: mensagem.slice(0, 500) },
    });

    // marca a falha sem apagar o último valor bom — o app continua servindo o antigo
    await prisma.marketSnapshot.create({
      data: {
        fonte: c.fonte,
        chave: `${c.id}:erro`,
        valor: 0,
        expiraEm: new Date(Date.now() + 3600_000),
        sucesso: false,
        erro: mensagem.slice(0, 500),
      },
    });

    console.error(`[mercado:${c.id}] falhou:`, mensagem);
    return {
      ...base,
      status: "FALHOU",
      itens: 0,
      mensagem,
      duracaoMs: Date.now() - inicio,
    };
  }
}

/** Roda todos os coletores. Um que quebra não derruba os outros. */
export async function coletarTudo(opcoes: { forcar?: boolean } = {}) {
  const inicio = Date.now();
  const resultados: ResultadoExecucao[] = [];

  for (const c of COLETORES) {
    resultados.push(await executarUm(c, opcoes.forcar ?? false));
  }

  await limparHistoricoAntigo();

  return {
    resultados,
    duracaoMs: Date.now() - inicio,
    ok: resultados.filter((r) => r.status === "OK").length,
    falhas: resultados.filter((r) => r.status === "FALHOU").length,
  };
}

export async function coletarUm(id: string, forcar = true): Promise<ResultadoExecucao> {
  const c = COLETORES.find((x) => x.id === id);
  if (!c) throw new Error(`Coletor desconhecido: ${id}`);
  return executarUm(c, forcar);
}

/**
 * Faxina. O plano gratuito do Supabase dá 500 MB — coleta diária sem poda
 * enche isso em alguns meses e aí o banco para de aceitar escrita.
 */
async function limparHistoricoAntigo(): Promise<void> {
  const noventaDias = new Date(Date.now() - 90 * 24 * 3600_000);
  const trintaDias = new Date(Date.now() - 30 * 24 * 3600_000);

  await Promise.all([
    prisma.marketSnapshot.deleteMany({ where: { coletadoEm: { lt: noventaDias } } }),
    // preço de produto individual é volumoso; a mediana já está em MarketSnapshot
    prisma.marketMaterialPrice.deleteMany({ where: { coletadoEm: { lt: trintaDias } } }),
    prisma.marketListingStat.deleteMany({ where: { coletadoEm: { lt: noventaDias } } }),
    prisma.marketRun.deleteMany({ where: { iniciadoEm: { lt: noventaDias } } }),
  ]);
}
