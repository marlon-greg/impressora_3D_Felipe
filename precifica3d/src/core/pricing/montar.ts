import type {
  EntradaPrecificacao,
  EntradaFilamento,
  EntradaMaterial,
  EntradaTrabalho,
  ModoMargem,
  Unidade,
} from "./calculator";

/**
 * Ponte entre o formulário e o motor de cálculo.
 *
 * Existe para que a prévia no navegador e o valor gravado no servidor saiam da
 * MESMA função. Se cada lado montasse a entrada do seu jeito, a tela mostraria
 * um preço e o banco guardaria outro — e a diferença só apareceria semanas
 * depois, quando ele fosse conferir por que a peça deu prejuízo.
 */

/** Catálogo do ateliê: o que existe para escolher no formulário. */
export interface Catalogo {
  materiais: {
    id: string;
    nome: string;
    categoria: string;
    unidade: Unidade;
    precoEmbalagem: number;
    tamanhoEmbalagem: number;
    rendimentoPecas: number | null;
    precoEstimado: boolean;
    cor: string | null;
    corHex: string | null;
    estoqueAtual: number;
  }[];
  impressoras: {
    id: string;
    nome: string;
    valorPago: number;
    vidaUtilHoras: number;
    manutencaoAnual: number;
    horasUsoAnual: number;
    potenciaWatts: number;
  }[];
  maoDeObra: { id: string; nome: string; valorHora: number }[];
  tarifaKwh: number;
  padroes: {
    modoMargem: ModoMargem;
    margemPadraoPct: number;
    taxaCanalPadraoPct: number;
    taxaPagamentoPct: number;
    impostoPct: number;
    custoIndiretoMensal: number;
    horasProdutivasMes: number;
    embalagemPadrao: number;
  };
}

/** O que o formulário guarda. Números como number — a conversão fica na borda. */
export interface Rascunho {
  nome: string;
  descricao: string;
  categoria: string;

  larguraMm: number | null;
  profundidadeMm: number | null;
  alturaMm: number | null;

  origemArquivo: "PRONTO" | "MODIFICADO" | "DO_ZERO";
  custoArquivo: number;
  fonteArquivo: string;

  printerId: string | null;
  horasImpressao: number;
  numeroPecas: number;
  horasPreparo: number;

  filamentos: { materialId: string; gramas: number; desperdicioPct: number }[];
  materiais: { materialId: string; quantidade: number }[];
  trabalhos: {
    laborRateId: string | null;
    descricao: string;
    horas: number;
    valorHora: number;
    antesDaImpressao: boolean;
  }[];

  precisaSuporte: boolean;
  paredesFinas: boolean;
  pecasMoveis: boolean;
  multiCor: boolean;
  encaixePreciso: boolean;
  impressaoAlta: boolean;
  refugoManualPct: number | null;

  fazLixamento: boolean;
  fazPrimer: boolean;
  fazPintura: boolean;
  fazVerniz: boolean;
  fazMontagem: boolean;

  modoMargem: ModoMargem;
  margemPct: number;
  taxaCanalPct: number;
  taxaPagamentoPct: number;
  impostoPct: number;
  embalagemCusto: number;
  freteEmbutido: number;

  precoVendaAtual: number | null;
  notas: string;
}

export function rascunhoVazio(cat: Catalogo): Rascunho {
  return {
    nome: "",
    descricao: "",
    categoria: "",
    larguraMm: null,
    profundidadeMm: null,
    alturaMm: null,
    origemArquivo: "PRONTO",
    custoArquivo: 0,
    fonteArquivo: "",
    // uma impressora só? já vem escolhida: obrigar a selecionar o único item
    // de uma lista é trabalho sem informação
    printerId: cat.impressoras.length === 1 ? cat.impressoras[0].id : null,
    horasImpressao: 0,
    numeroPecas: 1,
    horasPreparo: 0,
    filamentos: [],
    materiais: [],
    trabalhos: [],
    precisaSuporte: false,
    paredesFinas: false,
    pecasMoveis: false,
    multiCor: false,
    encaixePreciso: false,
    impressaoAlta: false,
    refugoManualPct: null,
    fazLixamento: false,
    fazPrimer: false,
    fazPintura: false,
    fazVerniz: false,
    fazMontagem: false,
    modoMargem: cat.padroes.modoMargem,
    margemPct: cat.padroes.margemPadraoPct,
    taxaCanalPct: cat.padroes.taxaCanalPadraoPct,
    taxaPagamentoPct: cat.padroes.taxaPagamentoPct,
    impostoPct: cat.padroes.impostoPct,
    embalagemCusto: cat.padroes.embalagemPadrao,
    freteEmbutido: 0,
    precoVendaAtual: null,
    notas: "",
  };
}

export function montarEntrada(r: Rascunho, cat: Catalogo): EntradaPrecificacao {
  const acharMaterial = (id: string) => cat.materiais.find((m) => m.id === id);
  const impressora = r.printerId ? cat.impressoras.find((p) => p.id === r.printerId) : null;

  const filamentos: EntradaFilamento[] = r.filamentos
    .map((f) => {
      const m = acharMaterial(f.materialId);
      if (!m) return null;
      return {
        materialId: m.id,
        nome: m.nome,
        cor: m.cor,
        gramas: f.gramas,
        desperdicioPct: f.desperdicioPct,
        precoEmbalagem: m.precoEmbalagem,
        tamanhoEmbalagem: m.tamanhoEmbalagem,
        precoEstimado: m.precoEstimado,
      };
    })
    .filter((f) => f !== null && f.gramas > 0) as EntradaFilamento[];

  const materiais: EntradaMaterial[] = r.materiais
    .map((x) => {
      const m = acharMaterial(x.materialId);
      if (!m) return null;
      return {
        materialId: m.id,
        nome: m.nome,
        categoria: m.categoria,
        unidade: m.unidade,
        quantidade: x.quantidade,
        precoEmbalagem: m.precoEmbalagem,
        tamanhoEmbalagem: m.tamanhoEmbalagem,
        rendimentoPecas: m.rendimentoPecas,
        precoEstimado: m.precoEstimado,
      };
    })
    .filter((m) => m !== null && m.quantidade > 0) as EntradaMaterial[];

  const trabalhos: EntradaTrabalho[] = r.trabalhos
    .filter((t) => t.horas > 0)
    .map((t) => ({
      descricao: t.descricao || "Trabalho",
      horas: t.horas,
      valorHora: t.valorHora,
      antesDaImpressao: t.antesDaImpressao,
    }));

  // horas de preparo e modelagem são trabalho humano como qualquer outro, e
  // acontecem antes da impressão: não se perdem se a peça falhar
  const valorHoraPadrao = cat.maoDeObra[0]?.valorHora ?? 0;
  if (r.horasPreparo > 0) {
    trabalhos.push({
      descricao: "Preparo e fatiamento",
      horas: r.horasPreparo,
      valorHora: valorHoraPadrao,
      antesDaImpressao: true,
    });
  }

  const maiorDimensao = Math.max(r.larguraMm ?? 0, r.profundidadeMm ?? 0, r.alturaMm ?? 0);

  return {
    impressora: impressora
      ? {
          nome: impressora.nome,
          valorPago: impressora.valorPago,
          vidaUtilHoras: impressora.vidaUtilHoras,
          manutencaoAnual: impressora.manutencaoAnual,
          horasUsoAnual: impressora.horasUsoAnual,
          potenciaWatts: impressora.potenciaWatts,
        }
      : null,
    tarifaKwh: cat.tarifaKwh,
    horasImpressao: r.horasImpressao,
    custoArquivo: r.custoArquivo,
    filamentos,
    materiais,
    trabalhos,
    complexidade: {
      precisaSuporte: r.precisaSuporte,
      paredesFinas: r.paredesFinas,
      pecasMoveis: r.pecasMoveis,
      multiCor: r.multiCor,
      encaixePreciso: r.encaixePreciso,
      impressaoAlta: r.impressaoAlta,
      numeroPecas: r.numeroPecas,
      horasImpressao: r.horasImpressao,
      maiorDimensaoMm: maiorDimensao > 0 ? maiorDimensao : null,
      refugoManualPct: r.refugoManualPct,
    },
    comercial: {
      modoMargem: r.modoMargem,
      margemPct: r.margemPct,
      taxaCanalPct: r.taxaCanalPct,
      taxaPagamentoPct: r.taxaPagamentoPct,
      impostoPct: r.impostoPct,
      embalagemCusto: r.embalagemCusto,
      freteEmbutido: r.freteEmbutido,
    },
    custoIndiretoMensal: cat.padroes.custoIndiretoMensal,
    horasProdutivasMes: cat.padroes.horasProdutivasMes,
  };
}

/** Slug estável a partir do nome, para a URL da peça ficar legível. */
export function gerarSlug(nome: string): string {
  return (
    nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "peca"
  );
}
