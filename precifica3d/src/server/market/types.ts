/**
 * Contrato dos coletores de mercado.
 *
 * Nenhuma tela do app chama API externa. Os coletores rodam agendados
 * (Vercel Cron ou botão manual), gravam no banco, e o app lê só do banco.
 * Se a internet cair ou um site mudar de layout, o sistema continua
 * funcionando com o último valor bom — só marca como desatualizado.
 */

export type FonteMercado = "CAMBIO" | "INDICE" | "LOJA" | "MARKETPLACE" | "MANUAL";

export interface PontoMercado {
  chave: string;
  valor: number;
  unidade?: string;
  meta?: Record<string, unknown>;
}

export interface PrecoInsumo {
  loja: string;
  produto: string;
  tipoMaterial?: string;
  marca?: string;
  precoBRL: number;
  pesoKg: number;
  url?: string;
  disponivel?: boolean;
}

export interface EstatisticaAnuncio {
  termo: string;
  precoMin: number;
  precoMedio: number;
  precoMax: number;
  precoMediana?: number;
  amostras: number;
}

export interface ResultadoColeta {
  pontos?: PontoMercado[];
  insumos?: PrecoInsumo[];
  anuncios?: EstatisticaAnuncio[];
}

export interface Coletor {
  id: string;
  nome: string;
  fonte: FonteMercado;
  /** por quantas horas o resultado vale antes de valer a pena buscar de novo */
  validadeHoras: number;
  /** true quando depende de scraping e pode quebrar sem aviso */
  fragil?: boolean;
  /** motivo pelo qual está indisponível (ex: falta credencial) — pula a coleta */
  indisponivel?(): string | null;
  coletar(): Promise<ResultadoColeta>;
}

/** fetch com timeout — coletor travado não pode segurar o cron inteiro */
export async function buscar(url: string, opcoes: RequestInit = {}, timeoutMs = 12_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opcoes,
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Precifica3D/1.0 (calculadora de precos para impressao 3D)",
        Accept: "application/json,text/html;q=0.9",
        ...(opcoes.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return res;
  } finally {
    clearTimeout(t);
  }
}

export const mediana = (n: number[]) => {
  if (n.length === 0) return 0;
  const s = [...n].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Descarta outliers por IQR — anúncio de R$ 2 e de R$ 5.000 na mesma busca é ruído. */
export function semOutliers(valores: number[]): number[] {
  if (valores.length < 4) return valores;
  const s = [...valores].sort((a, b) => a - b);
  const q = (p: number) => s[Math.floor(s.length * p)];
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const filtrado = s.filter((v) => v >= lo && v <= hi);
  return filtrado.length >= 3 ? filtrado : s;
}
