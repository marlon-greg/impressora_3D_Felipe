import { buscar, semOutliers, mediana, type Coletor, type EstatisticaAnuncio } from "../types";
import { env } from "@/config/env";

/**
 * Preço de VENDA praticado no Mercado Livre.
 *
 * Diferente dos outros coletores, este não olha o custo do insumo e sim
 * quanto o mercado está cobrando por peças parecidas. Serve para responder
 * "meu preço calculado está competitivo?" — que é uma pergunta diferente de
 * "meu preço cobre meus custos?". As duas importam.
 *
 * A API de busca do Mercado Livre exige credencial desde 2025 (sem token ela
 * responde 403). Sem ML_CLIENT_ID/SECRET no ambiente, o coletor se declara
 * indisponível e é pulado — nada quebra, a funcionalidade só fica desligada.
 */

const TERMOS_PADRAO = [
  "boneco impresso 3d",
  "luminaria 3d decoracao",
  "vaso decorativo impressao 3d",
  "chaveiro personalizado 3d",
  "miniatura impressa 3d pintada",
];

interface TokenCache {
  token: string;
  expiraEm: number;
}
let cacheToken: TokenCache | null = null;

async function obterToken(): Promise<string> {
  const e = env();
  if (cacheToken && cacheToken.expiraEm > Date.now() + 60_000) return cacheToken.token;

  const res = await buscar("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: e.ML_CLIENT_ID ?? "",
      client_secret: e.ML_CLIENT_SECRET ?? "",
    }).toString(),
  });

  const dados = (await res.json()) as { access_token: string; expires_in: number };
  cacheToken = {
    token: dados.access_token,
    expiraEm: Date.now() + dados.expires_in * 1000,
  };
  return cacheToken.token;
}

interface ResultadoML {
  results?: { title: string; price: number; currency_id: string; sold_quantity?: number }[];
}

async function estatisticaDe(termo: string, token: string): Promise<EstatisticaAnuncio | null> {
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=50`;
  const res = await buscar(url, { headers: { Authorization: `Bearer ${token}` } });
  const dados = (await res.json()) as ResultadoML;

  const precos = (dados.results ?? [])
    .filter((r) => r.currency_id === "BRL" && r.price > 0)
    .map((r) => r.price);

  if (precos.length < 5) return null;

  // anúncio de R$ 2 (isca de frete) e de R$ 5.000 (encomenda industrial)
  // na mesma busca destroem a média — o IQR tira os dois
  const limpos = semOutliers(precos);
  const soma = limpos.reduce((s, v) => s + v, 0);

  return {
    termo,
    precoMin: Math.min(...limpos),
    precoMedio: Math.round((soma / limpos.length) * 100) / 100,
    precoMax: Math.max(...limpos),
    precoMediana: mediana(limpos),
    amostras: limpos.length,
  };
}

export const coletorMarketplace: Coletor = {
  id: "marketplace-ml",
  nome: "Preço praticado (Mercado Livre)",
  fonte: "MARKETPLACE",
  validadeHoras: 24 * 3,

  indisponivel() {
    const e = env();
    if (!e.ML_CLIENT_ID || !e.ML_CLIENT_SECRET) {
      return "Sem ML_CLIENT_ID/ML_CLIENT_SECRET — crie um app grátis em developers.mercadolivre.com.br para ativar.";
    }
    return null;
  },

  async coletar() {
    const token = await obterToken();

    const resultados = await Promise.allSettled(
      TERMOS_PADRAO.map((t) => estatisticaDe(t, token)),
    );

    const anuncios = resultados
      .filter(
        (r): r is PromiseFulfilledResult<EstatisticaAnuncio> =>
          r.status === "fulfilled" && r.value !== null,
      )
      .map((r) => r.value);

    if (anuncios.length === 0) {
      throw new Error("Nenhuma busca do Mercado Livre trouxe amostra suficiente");
    }

    return { anuncios };
  },
};
