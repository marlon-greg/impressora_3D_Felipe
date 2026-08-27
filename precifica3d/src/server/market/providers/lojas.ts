import { buscar, semOutliers, mediana, type Coletor, type PrecoInsumo } from "../types";

/**
 * Preço de filamento em lojas brasileiras.
 *
 * Usamos a Store API do WooCommerce (`/wp-json/wc/store/v1/products`), que é
 * pública, devolve JSON estruturado e é MUITO mais estável que raspar HTML:
 * quando a loja troca o tema, o HTML muda inteiro, mas a API continua igual.
 *
 * Ainda assim é o coletor mais frágil do conjunto — por isso `fragil: true`.
 * Se uma loja sair do ar, as outras continuam e o sistema segue com o último
 * valor bom em cache.
 */

interface ProdutoWoo {
  id: number;
  name: string;
  permalink: string;
  is_in_stock: boolean;
  prices: {
    price: string; // em centavos, como string
    currency_minor_unit: number;
  };
}

interface Loja {
  nome: string;
  base: string;
  buscas: string[];
}

const LOJAS: Loja[] = [
  { nome: "3D Fila", base: "https://3dfila.com.br", buscas: ["filamento petg", "filamento pla"] },
  { nome: "3D Lab", base: "https://3dlab.com.br", buscas: ["filamento petg", "filamento pla"] },
];

/** Marcas conhecidas, para atribuir o preço ao fabricante certo. */
const MARCAS = [
  "3D Fila", "3D Lab", "Voolt", "Sethi", "National", "Cliever",
  "Easy Print", "EasyPrint", "Polyflow", "Masterprint", "Volt3D", "GTMax",
  "Creality", "Esun", "eSUN", "Bambu",
];

const TIPOS = ["PETG", "PLA", "ABS", "TPU", "ASA", "PC", "NYLON"];

/** Extrai o peso do rolo do próprio nome do produto. */
function pesoDoNome(nome: string): number | null {
  const kg = nome.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if (kg) return Number(kg[1].replace(",", "."));
  const g = nome.match(/(\d{3,4})\s*g\b/i);
  if (g) return Number(g[1]) / 1000;
  return null;
}

const acharEm = (nome: string, lista: string[]) =>
  lista.find((t) => nome.toLowerCase().includes(t.toLowerCase()));

async function coletarLoja(loja: Loja): Promise<PrecoInsumo[]> {
  const achados: PrecoInsumo[] = [];

  for (const termo of loja.buscas) {
    const url = `${loja.base}/wp-json/wc/store/v1/products?search=${encodeURIComponent(termo)}&per_page=30`;

    // Algumas lojas ficam atrás de Cloudflare e devolvem 403 para requisição
    // que não parece navegador. Não estamos burlando proteção: é uma API
    // pública de catálogo, lida devagar (2 buscas por loja, 1×/dia).
    const res = await buscar(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9",
          Referer: loja.base,
        },
      },
      15_000,
    );
    const produtos = (await res.json()) as ProdutoWoo[];

    for (const p of produtos) {
      const centavos = Number(p.prices?.price);
      if (!Number.isFinite(centavos) || centavos <= 0) continue;

      const divisor = 10 ** (p.prices.currency_minor_unit ?? 2);
      const preco = centavos / divisor;

      const tipo = acharEm(p.name, TIPOS);
      if (!tipo) continue; // não é filamento identificável

      // sem peso declarado assumimos 1 kg, que é o carretel padrão do mercado
      const pesoKg = pesoDoNome(p.name) ?? 1;
      const precoPorKg = preco / pesoKg;

      // descarta preço absurdo: amostra de 50 g e kit com 10 rolos distorcem a média
      if (precoPorKg < 40 || precoPorKg > 900) continue;

      achados.push({
        loja: loja.nome,
        produto: p.name.slice(0, 200),
        tipoMaterial: tipo.toUpperCase(),
        marca: acharEm(p.name, MARCAS) ?? loja.nome,
        precoBRL: preco,
        pesoKg,
        precoPorKg,
        url: p.permalink,
        disponivel: p.is_in_stock !== false,
      });
    }
  }

  return achados;
}

export const coletorLojas: Coletor = {
  id: "lojas-woocommerce",
  nome: "Preço de filamento em lojas BR",
  fonte: "LOJA",
  validadeHoras: 24,
  fragil: true,

  async coletar() {
    const resultados = await Promise.allSettled(LOJAS.map(coletarLoja));

    const insumos = resultados
      .filter((r): r is PromiseFulfilledResult<PrecoInsumo[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    // loja que falha precisa aparecer no log: falha silenciosa vira dado
    // enviesado (a média passa a refletir só quem respondeu) sem ninguém notar
    const quebradas: string[] = [];
    resultados.forEach((r, i) => {
      if (r.status === "rejected") {
        const motivo = r.reason instanceof Error ? r.reason.message : String(r.reason);
        quebradas.push(LOJAS[i].nome);
        console.warn(`[mercado:lojas] ${LOJAS[i].nome} não respondeu — ${motivo}`);
      } else if (r.value.length === 0) {
        quebradas.push(`${LOJAS[i].nome} (sem produto reconhecido)`);
        console.warn(`[mercado:lojas] ${LOJAS[i].nome} respondeu, mas nenhum produto casou com os filtros`);
      }
    });

    if (insumos.length === 0) {
      throw new Error(
        `Nenhuma loja respondeu com produto válido${quebradas.length ? ` (falharam: ${quebradas.join(", ")})` : ""}`,
      );
    }

    // mediana por tipo de material — resiste a outlier melhor que a média
    const pontos = TIPOS.map((tipo) => {
      const doTipo = insumos.filter((i) => i.tipoMaterial === tipo && i.disponivel);
      if (doTipo.length < 3) return null;

      const precos = semOutliers(
        doTipo.map((i) => i.precoPorKg ?? i.precoBRL / i.pesoKg).filter((v) => v > 0),
      );
      if (precos.length === 0) return null;

      return {
        chave: `${tipo}-MEDIA-KG`,
        valor: Math.round(mediana(precos) * 100) / 100,
        unidade: "BRL/kg",
        meta: {
          amostras: precos.length,
          minimo: Math.min(...precos),
          maximo: Math.max(...precos),
          lojas: [...new Set(doTipo.map((i) => i.loja))],
          lojasComFalha: quebradas,
        },
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null);

    return {
      insumos: insumos.map((i) => ({ ...i, precoPorKg: i.precoBRL / i.pesoKg })),
      pontos,
    };
  },
};
