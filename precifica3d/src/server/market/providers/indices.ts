import { buscar, type Coletor } from "../types";

/**
 * IPCA e IGP-M direto da API de séries temporais do Banco Central (SGS).
 * Grátis, sem chave, sem limite prático — é dado público oficial.
 *
 * Serve de referência honesta: se o preço do filamento dele subiu 3% e a
 * inflação do período foi 4%, na prática o insumo ficou mais barato. Sem
 * esse contraste, toda variação parece aumento.
 */

const SERIES = {
  IPCA: 433, // IPCA — variação mensal (%)
  IGPM: 189, // IGP-M — variação mensal (%)
} as const;

interface PontoSGS {
  data: string; // "01/07/2026"
  valor: string;
}

const MESES = 12;

async function serie(codigo: number): Promise<PontoSGS[]> {
  const res = await buscar(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/${MESES}?formato=json`,
  );
  return (await res.json()) as PontoSGS[];
}

/** Acumulado composto do período: (1+a)(1+b)... − 1, não a soma simples. */
function acumular(valores: number[]): number {
  const fator = valores.reduce((acc, v) => acc * (1 + v / 100), 1);
  return Math.round((fator - 1) * 10000) / 100;
}

export const coletorIndices: Coletor = {
  id: "indices-bcb",
  nome: "Inflação (Banco Central)",
  fonte: "INDICE",
  validadeHoras: 24 * 7, // publicação é mensal; buscar toda semana já é folgado

  async coletar() {
    const pontos = [];

    for (const [nome, codigo] of Object.entries(SERIES)) {
      const dados = await serie(codigo);
      const valores = dados
        .map((d) => Number(d.valor.replace(",", ".")))
        .filter(Number.isFinite);

      if (valores.length === 0) continue;

      const ultimo = valores[valores.length - 1];
      const doze = acumular(valores);
      const seis = acumular(valores.slice(-6));

      pontos.push({
        chave: nome,
        valor: ultimo,
        unidade: "%",
        meta: {
          referencia: dados[dados.length - 1]?.data,
          acumulado6m: seis,
          acumulado12m: doze,
          serie: dados.slice(-6),
        },
      });
    }

    if (pontos.length === 0) throw new Error("Banco Central não devolveu nenhuma série válida");

    return { pontos };
  },
};
