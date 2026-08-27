import { buscar, type Coletor } from "../types";

/**
 * Câmbio via AwesomeAPI — grátis, sem chave, sem cadastro.
 *
 * Por que isso importa para quem imprime em 3D: filamento no Brasil é
 * majoritariamente resina importada ou cotada em dólar. Quando o dólar sobe,
 * o preço do rolo sobe algumas semanas depois. Acompanhar o câmbio dá ao
 * Felipe um aviso antecipado, antes de a alta chegar na loja.
 */

interface Cotacao {
  code: string;
  codein: string;
  bid: string;
  ask: string;
  high: string;
  low: string;
  pctChange: string;
  varBid: string;
  create_date: string;
}

const PARES = ["USD-BRL", "EUR-BRL"] as const;

export const coletorCambio: Coletor = {
  id: "cambio-awesomeapi",
  nome: "Câmbio (AwesomeAPI)",
  fonte: "CAMBIO",
  validadeHoras: 12,

  async coletar() {
    const res = await buscar(
      `https://economia.awesomeapi.com.br/json/last/${PARES.join(",")}`,
    );
    const dados = (await res.json()) as Record<string, Cotacao>;

    const pontos = PARES.map((par) => {
      const chaveApi = par.replace("-", "");
      const c = dados[chaveApi];
      if (!c) return null;

      const valor = Number(c.bid);
      if (!Number.isFinite(valor) || valor <= 0) return null;

      return {
        chave: par,
        valor,
        unidade: "BRL",
        meta: {
          variacaoPct: Number(c.pctChange),
          variacaoAbs: Number(c.varBid),
          maxima: Number(c.high),
          minima: Number(c.low),
          atualizadoEm: c.create_date,
        },
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null);

    if (pontos.length === 0) throw new Error("AwesomeAPI respondeu sem nenhuma cotação válida");

    return { pontos };
  },
};
