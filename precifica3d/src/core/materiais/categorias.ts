/**
 * O que cada categoria de material significa na prática.
 *
 * TypeScript puro, sem banco: o formulário, a lista e o cálculo leem daqui, e
 * assim "tinta se mede em ml" está escrito num lugar só.
 */

export type Categoria =
  | "FILAMENTO"
  | "TINTA"
  | "PRIMER"
  | "VERNIZ"
  | "MASSA"
  | "COLA"
  | "ABRASIVO"
  | "PINCEL"
  | "FERRAGEM"
  | "EMBALAGEM"
  | "OUTRO";

export type Unidade = "G" | "ML" | "UN";

export interface DefinicaoCategoria {
  rotulo: string;
  plural: string;
  icone: string;
  unidadePadrao: Unidade;
  /** tamanho típico da embalagem, só para pré-preencher o formulário */
  embalagemPadrao: number;
  /** consome-se por peça em quantidade medida (ml, g) ou por peça inteira? */
  divisivel: boolean;
  /** campos extras de filamento (diâmetro, densidade, temperaturas) */
  camposFilamento?: boolean;
  ajuda: string;
}

export const CATEGORIAS: Record<Categoria, DefinicaoCategoria> = {
  FILAMENTO: {
    rotulo: "Filamento",
    plural: "Filamentos",
    icone: "🧵",
    unidadePadrao: "G",
    embalagemPadrao: 1000,
    divisivel: true,
    camposFilamento: true,
    ajuda: "O rolo. O preço por grama sai do valor pago dividido pelos gramas da embalagem.",
  },
  TINTA: {
    rotulo: "Tinta",
    plural: "Tintas",
    icone: "🎨",
    unidadePadrao: "ML",
    embalagemPadrao: 37,
    divisivel: true,
    ajuda: "Pote ou bisnaga. Anote o volume da embalagem em ml — é o que divide o preço.",
  },
  PRIMER: {
    rotulo: "Primer",
    plural: "Primers",
    icone: "🥫",
    unidadePadrao: "ML",
    embalagemPadrao: 400,
    divisivel: true,
    ajuda: "Fundo preparador. Spray costuma vir em 400 ml.",
  },
  VERNIZ: {
    rotulo: "Verniz",
    plural: "Vernizes",
    icone: "✨",
    unidadePadrao: "ML",
    embalagemPadrao: 400,
    divisivel: true,
    ajuda: "Acabamento fosco ou brilhante, por cima da pintura.",
  },
  MASSA: {
    rotulo: "Massa",
    plural: "Massas",
    icone: "🧱",
    unidadePadrao: "G",
    embalagemPadrao: 500,
    divisivel: true,
    ajuda: "Massa de emenda ou modelagem, para tapar camada e imperfeição.",
  },
  COLA: {
    rotulo: "Cola",
    plural: "Colas",
    icone: "💧",
    unidadePadrao: "ML",
    embalagemPadrao: 20,
    divisivel: true,
    ajuda: "Instantânea, epóxi ou PVA. Em gramas se a embalagem informar peso.",
  },
  ABRASIVO: {
    rotulo: "Lixa",
    plural: "Lixas",
    icone: "🪵",
    unidadePadrao: "UN",
    embalagemPadrao: 1,
    divisivel: false,
    ajuda: "Folha de lixa. Diga quantas peças uma folha aguenta antes de gastar.",
  },
  PINCEL: {
    rotulo: "Pincel",
    plural: "Pincéis",
    icone: "🖌️",
    unidadePadrao: "UN",
    embalagemPadrao: 1,
    divisivel: false,
    ajuda: "Um pincel pinta muitas peças. Informe quantas, para ratear o custo.",
  },
  FERRAGEM: {
    rotulo: "Ferragem",
    plural: "Ferragens",
    icone: "🔩",
    unidadePadrao: "UN",
    embalagemPadrao: 1,
    divisivel: true,
    ajuda: "Ímã, parafuso, LED, argola — o que entra montado na peça.",
  },
  EMBALAGEM: {
    rotulo: "Embalagem",
    plural: "Embalagens",
    icone: "📦",
    unidadePadrao: "UN",
    embalagemPadrao: 1,
    divisivel: true,
    ajuda: "Caixa, plástico bolha, etiqueta, sacola.",
  },
  OUTRO: {
    rotulo: "Outro",
    plural: "Outros",
    icone: "🧰",
    unidadePadrao: "UN",
    embalagemPadrao: 1,
    divisivel: true,
    ajuda: "O que não se encaixa nas outras categorias.",
  },
};

export const ORDEM_CATEGORIAS: Categoria[] = [
  "FILAMENTO",
  "TINTA",
  "PRIMER",
  "VERNIZ",
  "MASSA",
  "COLA",
  "ABRASIVO",
  "PINCEL",
  "FERRAGEM",
  "EMBALAGEM",
  "OUTRO",
];

export const ROTULO_UNIDADE: Record<Unidade, string> = {
  G: "gramas",
  ML: "mililitros",
  UN: "unidades",
};

export const SIGLA_UNIDADE: Record<Unidade, string> = { G: "g", ML: "ml", UN: "un" };

/** Quanto custa uma unidade (1 g, 1 ml, 1 un) desse material. */
export function custoUnitario(precoEmbalagem: number, tamanhoEmbalagem: number): number {
  if (!tamanhoEmbalagem || tamanhoEmbalagem <= 0) return 0;
  return precoEmbalagem / tamanhoEmbalagem;
}

/**
 * Quanto rende um rolo de filamento em metros.
 * Serve de conferência: se o número destoa muito do que a etiqueta diz, ou a
 * densidade ou o peso da embalagem está errado.
 */
export function metrosDeFilamento(
  gramas: number,
  diametroMm: number,
  densidadeGcm3: number,
): number {
  if (!diametroMm || !densidadeGcm3) return 0;
  const raioCm = diametroMm / 20; // mm → cm, e diâmetro → raio
  const areaCm2 = Math.PI * raioCm * raioCm;
  const volumeCm3 = gramas / densidadeGcm3;
  return volumeCm3 / areaCm2 / 100; // cm → m
}
