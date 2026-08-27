/**
 * Motor de precificação — TypeScript puro, sem dependência de banco.
 *
 * As taxas (marketplace, maquininha, imposto) NÃO podem ser somadas à margem
 * nem multiplicadas no fim: elas saem por cima do preço. Se você vende a 100
 * e o marketplace fica com 15, você recebe 85. Por isso o preço se divide
 * por (1 − taxas), sempre.
 *
 * "Margem" tem dois significados e confundi-los é o erro nº 1 de quem vende 3D:
 *
 *   MARKUP           quanto você põe em cima do custo   → preço = custo × (1 + m)
 *   MARGEM_LIQUIDA   quanto do preço final é lucro      → preço = custo ÷ (1 − m)
 *
 * Com m = 60%: markup dá 1,6× o custo. Margem líquida dá 2,5× o custo.
 * O padrão aqui é MARKUP, porque é como o vendedor pensa ("ponho 60% em cima").
 */

export type Unidade = "G" | "ML" | "UN";

export interface EntradaFilamento {
  materialId: string;
  nome: string;
  cor?: string | null;
  gramas: number;
  desperdicioPct: number;
  /** R$ pagos na embalagem cheia */
  precoEmbalagem: number;
  /** tamanho da embalagem na unidade do material (ex: 1000 g) */
  tamanhoEmbalagem: number;
  precoEstimado?: boolean;
}

export interface EntradaMaterial {
  materialId: string;
  nome: string;
  categoria: string;
  unidade: Unidade;
  quantidade: number;
  precoEmbalagem: number;
  tamanhoEmbalagem: number;
  /** para itens indivisíveis (pincel, lixa): quantas peças o item rende */
  rendimentoPecas?: number | null;
  precoEstimado?: boolean;
}

export interface EntradaTrabalho {
  descricao: string;
  horas: number;
  valorHora: number;
  /** trabalho feito ANTES da impressão (modelagem, preparo) não se perde se a peça falhar */
  antesDaImpressao?: boolean;
}

export interface EntradaImpressora {
  nome: string;
  valorPago: number;
  vidaUtilHoras: number;
  manutencaoAnual: number;
  horasUsoAnual: number;
  potenciaWatts: number;
}

export interface EntradaComplexidade {
  precisaSuporte: boolean;
  paredesFinas: boolean;
  pecasMoveis: boolean;
  multiCor: boolean;
  encaixePreciso: boolean;
  impressaoAlta: boolean;
  numeroPecas: number;
  horasImpressao: number;
  maiorDimensaoMm?: number | null;
  /** se preenchido, ignora o cálculo automático */
  refugoManualPct?: number | null;
}

export type ModoMargem = "MARKUP" | "MARGEM_LIQUIDA";

export interface EntradaComercial {
  /** MARKUP: % em cima do custo. MARGEM_LIQUIDA: % do preço final que é lucro. */
  modoMargem: ModoMargem;
  margemPct: number;
  taxaCanalPct: number;
  taxaPagamentoPct: number;
  impostoPct: number;
  embalagemCusto: number;
  freteEmbutido: number;
}

export interface EntradaPrecificacao {
  impressora?: EntradaImpressora | null;
  /** R$/kWh real, calculado da conta de luz */
  tarifaKwh: number;
  horasImpressao: number;
  custoArquivo: number;
  filamentos: EntradaFilamento[];
  materiais: EntradaMaterial[];
  trabalhos: EntradaTrabalho[];
  complexidade: EntradaComplexidade;
  comercial: EntradaComercial;
  /** R$/mês de custo indireto ÷ horas produtivas/mês */
  custoIndiretoMensal: number;
  horasProdutivasMes: number;
}

export interface LinhaCusto {
  chave: string;
  rotulo: string;
  valor: number;
  detalhe?: string;
  /** custo que se perde quando a impressão falha */
  perdeNaFalhaImpressao?: boolean;
  /** custo que se perde quando a peça quebra no acabamento */
  perdeNaFalhaAcabamento?: boolean;
}

export interface FaixaPreco {
  rotulo: string;
  /** valor aplicado no modo escolhido */
  margemPct: number;
  preco: number;
  /** o que sobra depois das taxas e do custo */
  lucroLiquido: number;
  /** lucro ÷ preço — quanto do preço final é lucro de verdade */
  margemRealPct: number;
  /** lucro ÷ custo — quanto você pôs em cima do custo */
  markupRealPct: number;
  /** quanto o marketplace/maquininha/imposto leva */
  taxasEmReais: number;
}

export interface ResultadoPrecificacao {
  linhas: (LinhaCusto & { participacaoPct: number })[];
  custoDireto: number;
  reservaRefugo: number;
  custoTotal: number;
  modoMargem: ModoMargem;

  risco: {
    score: number;
    nivel: "BAIXO" | "MEDIO" | "ALTO" | "MUITO_ALTO";
    taxaFalhaImpressaoPct: number;
    taxaFalhaAcabamentoPct: number;
    fatores: string[];
    manual: boolean;
  };

  taxasTotaisPct: number;
  faixas: { minimo: FaixaPreco; ideal: FaixaPreco; premium: FaixaPreco };

  horasImpressao: number;
  horasHumanas: number;
  ganhoPorHoraMaquina: number;
  ganhoPorHoraHumana: number;

  /** avisos que a UI mostra em destaque */
  avisos: { nivel: "info" | "atencao" | "critico"; texto: string }[];
}

/** Piso: 20% em cima do custo. Abaixo disso qualquer imprevisto vira prejuízo. */
const MARKUP_MINIMO_PCT = 20;
/** Premium = markup configurado × isso. */
const PREMIUM_FATOR = 1.6;
/** No modo margem líquida, margem + taxas não pode chegar em 100% (preço → infinito). */
const TETO_MARGEM_MAIS_TAXAS = 85;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Custo unitário de um material a partir da embalagem. */
export function custoPorUnidade(precoEmbalagem: number, tamanhoEmbalagem: number): number {
  if (!tamanhoEmbalagem || tamanhoEmbalagem <= 0) return 0;
  return precoEmbalagem / tamanhoEmbalagem;
}

/**
 * Score de risco 0–100 a partir da geometria e do tempo.
 * Uma peça de 18 h com paredes finas não pode ser precificada
 * como uma de 40 min — a chance de refazer é ordens de grandeza maior.
 */
export function calcularRisco(c: EntradaComplexidade) {
  const fatores: string[] = [];
  let score = 5; // toda impressão tem um piso de risco

  if (c.precisaSuporte) {
    score += 8;
    fatores.push("Precisa de suporte (marca a peça, pode descolar)");
  }
  if (c.paredesFinas) {
    score += 14;
    fatores.push("Paredes finas (quebra fácil no manuseio e no pós)");
  }
  if (c.pecasMoveis) {
    score += 12;
    fatores.push("Peças móveis (tolerância apertada, pode travar)");
  }
  if (c.multiCor) {
    score += 8;
    fatores.push("Troca de cor (purga, risco de falha na troca)");
  }
  if (c.encaixePreciso) {
    score += 10;
    fatores.push("Encaixe preciso (pode não fechar e perder o conjunto)");
  }
  if (c.impressaoAlta) {
    score += 10;
    fatores.push("Peça alta (risco de tombar / warping no topo)");
  }

  if (c.numeroPecas > 1) {
    const extra = Math.min(15, (c.numeroPecas - 1) * 3);
    score += extra;
    fatores.push(`${c.numeroPecas} partes impressas (falha em 1 compromete o conjunto)`);
  }

  const h = c.horasImpressao;
  if (h > 30) {
    score += 18;
    fatores.push(`${h} h de impressão (falha tardia custa caro)`);
  } else if (h > 20) {
    score += 13;
    fatores.push(`${h} h de impressão`);
  } else if (h > 10) {
    score += 8;
    fatores.push(`${h} h de impressão`);
  } else if (h > 5) {
    score += 4;
  }

  const dim = c.maiorDimensaoMm ?? 0;
  if (dim > 200) {
    score += 8;
    fatores.push(`Peça grande (${dim} mm — mais área de contato e warping)`);
  } else if (dim > 120) {
    score += 4;
  }

  score = Math.min(100, Math.round(score));

  const nivel: "BAIXO" | "MEDIO" | "ALTO" | "MUITO_ALTO" =
    score < 20 ? "BAIXO" : score < 40 ? "MEDIO" : score < 65 ? "ALTO" : "MUITO_ALTO";

  const manual = c.refugoManualPct != null;

  // score 0→100 vira taxa de falha 2%→35%
  const taxaFalhaImpressaoPct = manual
    ? c.refugoManualPct!
    : r2(Math.min(35, 2 + (score / 100) * 33));

  // quebrar depois de pintado é mais raro, mas dói mais — metade da taxa
  const taxaFalhaAcabamentoPct = r2(taxaFalhaImpressaoPct * 0.5);

  return { score, nivel, taxaFalhaImpressaoPct, taxaFalhaAcabamentoPct, fatores, manual };
}

export function precificar(e: EntradaPrecificacao): ResultadoPrecificacao {
  const linhas: LinhaCusto[] = [];
  const avisos: ResultadoPrecificacao["avisos"] = [];

  // ── 1. Filamento ────────────────────────────────────────────
  let custoFilamento = 0;
  let gramasTotais = 0;
  for (const f of e.filamentos) {
    const gramasReais = f.gramas * (1 + f.desperdicioPct / 100);
    const custo = gramasReais * custoPorUnidade(f.precoEmbalagem, f.tamanhoEmbalagem);
    custoFilamento += custo;
    gramasTotais += gramasReais;
    if (f.precoEstimado) {
      avisos.push({
        nivel: "atencao",
        texto: `O preço do filamento "${f.nome}" é uma estimativa. Corrija com o valor real da nota pra o cálculo ficar confiável.`,
      });
    }
  }
  if (custoFilamento > 0) {
    linhas.push({
      chave: "filamento",
      rotulo: "Filamento",
      valor: r2(custoFilamento),
      detalhe: `${r2(gramasTotais)} g (já com desperdício/purga)`,
      perdeNaFalhaImpressao: true,
    });
  }

  // ── 2. Energia ──────────────────────────────────────────────
  const watts = e.impressora?.potenciaWatts ?? 0;
  const kwh = (watts / 1000) * e.horasImpressao;
  const custoEnergia = kwh * e.tarifaKwh;
  if (custoEnergia > 0) {
    linhas.push({
      chave: "energia",
      rotulo: "Energia elétrica",
      valor: r2(custoEnergia),
      detalhe: `${r2(kwh)} kWh × R$ ${r2(e.tarifaKwh)}/kWh (tarifa real da conta)`,
      perdeNaFalhaImpressao: true,
    });
  }

  // ── 3. Depreciação da impressora ────────────────────────────
  let custoDepreciacao = 0;
  if (e.impressora && e.impressora.vidaUtilHoras > 0) {
    const porHora = e.impressora.valorPago / e.impressora.vidaUtilHoras;
    custoDepreciacao = porHora * e.horasImpressao;
    linhas.push({
      chave: "depreciacao",
      rotulo: "Depreciação da impressora",
      valor: r2(custoDepreciacao),
      detalhe: `R$ ${r2(porHora)}/h × ${e.horasImpressao} h — a máquina se paga em ${e.impressora.vidaUtilHoras} h`,
      perdeNaFalhaImpressao: true,
    });
  }

  // ── 4. Manutenção ───────────────────────────────────────────
  let custoManutencao = 0;
  if (e.impressora && e.impressora.horasUsoAnual > 0 && e.impressora.manutencaoAnual > 0) {
    const porHora = e.impressora.manutencaoAnual / e.impressora.horasUsoAnual;
    custoManutencao = porHora * e.horasImpressao;
    linhas.push({
      chave: "manutencao",
      rotulo: "Manutenção e peças de reposição",
      valor: r2(custoManutencao),
      detalhe: `R$ ${r2(porHora)}/h (bico, correia, mesa, PTFE)`,
      perdeNaFalhaImpressao: true,
    });
  }

  // ── 5. Materiais de acabamento ──────────────────────────────
  let custoAcabamento = 0;
  const detalhesAcabamento: string[] = [];
  for (const m of e.materiais) {
    const custo =
      m.rendimentoPecas && m.rendimentoPecas > 0
        ? m.precoEmbalagem / m.rendimentoPecas
        : m.quantidade * custoPorUnidade(m.precoEmbalagem, m.tamanhoEmbalagem);
    custoAcabamento += custo;
    detalhesAcabamento.push(`${m.nome} (R$ ${r2(custo)})`);
    if (m.precoEstimado) {
      avisos.push({
        nivel: "atencao",
        texto: `O preço de "${m.nome}" é uma estimativa. Corrija com o valor real da nota.`,
      });
    }
  }
  if (custoAcabamento > 0) {
    linhas.push({
      chave: "acabamento",
      rotulo: "Materiais de acabamento",
      valor: r2(custoAcabamento),
      detalhe: detalhesAcabamento.join(" · "),
      perdeNaFalhaAcabamento: true,
    });
  }

  // ── 6. Arquivo / licença ────────────────────────────────────
  if (e.custoArquivo > 0) {
    linhas.push({
      chave: "arquivo",
      rotulo: "Arquivo 3D (licença/compra)",
      valor: r2(e.custoArquivo),
      detalhe: "Rateie pelo nº de peças que você vai vender desse modelo",
    });
  }

  // ── 7. Mão de obra ──────────────────────────────────────────
  let custoMaoObraPre = 0;
  let custoMaoObraPos = 0;
  let horasHumanas = 0;
  const detalhesTrabalho: string[] = [];
  for (const t of e.trabalhos) {
    const custo = t.horas * t.valorHora;
    horasHumanas += t.horas;
    if (t.antesDaImpressao) custoMaoObraPre += custo;
    else custoMaoObraPos += custo;
    if (t.horas > 0) detalhesTrabalho.push(`${t.descricao}: ${t.horas} h`);
  }
  const custoMaoObra = custoMaoObraPre + custoMaoObraPos;
  if (custoMaoObra > 0) {
    linhas.push({
      chave: "maoDeObra",
      rotulo: "Mão de obra",
      valor: r2(custoMaoObra),
      detalhe: detalhesTrabalho.join(" · "),
      perdeNaFalhaAcabamento: custoMaoObraPos > 0,
    });
  }

  // ── 8. Custo indireto rateado ───────────────────────────────
  let custoIndireto = 0;
  if (e.horasProdutivasMes > 0 && e.custoIndiretoMensal > 0) {
    const porHora = e.custoIndiretoMensal / e.horasProdutivasMes;
    custoIndireto = porHora * horasHumanas;
    if (custoIndireto > 0) {
      linhas.push({
        chave: "indireto",
        rotulo: "Custo indireto rateado",
        valor: r2(custoIndireto),
        detalhe: `R$ ${r2(porHora)}/h de trabalho (internet, software, espaço)`,
      });
    }
  }

  // ── 9. Embalagem e frete ────────────────────────────────────
  if (e.comercial.embalagemCusto > 0) {
    linhas.push({
      chave: "embalagem",
      rotulo: "Embalagem",
      valor: r2(e.comercial.embalagemCusto),
      detalhe: "Caixa, plástico bolha, etiqueta",
    });
  }
  if (e.comercial.freteEmbutido > 0) {
    linhas.push({
      chave: "frete",
      rotulo: "Frete embutido",
      valor: r2(e.comercial.freteEmbutido),
    });
  }

  // ── 10. Reserva de refugo ───────────────────────────────────
  const risco = calcularRisco({ ...e.complexidade, horasImpressao: e.horasImpressao });

  const baseFalhaImpressao = linhas
    .filter((l) => l.perdeNaFalhaImpressao)
    .reduce((s, l) => s + l.valor, 0);
  const baseFalhaAcabamento = linhas
    .filter((l) => l.perdeNaFalhaAcabamento)
    .reduce((s, l) => s + l.valor, 0);

  const reservaImpressao = baseFalhaImpressao * (risco.taxaFalhaImpressaoPct / 100);
  const reservaAcabamento = baseFalhaAcabamento * (risco.taxaFalhaAcabamentoPct / 100);
  const reservaRefugo = reservaImpressao + reservaAcabamento;

  const custoDireto = linhas.reduce((s, l) => s + l.valor, 0);

  if (reservaRefugo > 0) {
    linhas.push({
      chave: "refugo",
      rotulo: "Reserva para quebra/refugo",
      valor: r2(reservaRefugo),
      detalhe: risco.manual
        ? `${risco.taxaFalhaImpressaoPct}% definido manualmente`
        : `${risco.taxaFalhaImpressaoPct}% na impressão + ${risco.taxaFalhaAcabamentoPct}% no acabamento (risco ${risco.nivel.toLowerCase().replace("_", " ")})`,
    });
  }

  const custoTotal = r2(custoDireto + reservaRefugo);

  // ── 11. Preço ───────────────────────────────────────────────
  const taxasTotaisPct =
    e.comercial.taxaCanalPct + e.comercial.taxaPagamentoPct + e.comercial.impostoPct;

  const fatorTaxas = 1 - taxasTotaisPct / 100;
  const modo = e.comercial.modoMargem;

  const faixa = (rotulo: string, margemPctBruta: number): FaixaPreco => {
    let margemPct = margemPctBruta;
    let preco: number;

    if (modo === "MARKUP") {
      // custo + markup, e o preço sobe o suficiente pra taxa sair por cima
      preco = fatorTaxas > 0 ? (custoTotal * (1 + margemPct / 100)) / fatorTaxas : custoTotal;
    } else {
      if (margemPct + taxasTotaisPct > TETO_MARGEM_MAIS_TAXAS) {
        margemPct = Math.max(0, TETO_MARGEM_MAIS_TAXAS - taxasTotaisPct);
      }
      const denom = 1 - (margemPct + taxasTotaisPct) / 100;
      preco = denom > 0 ? custoTotal / denom : custoTotal;
    }

    const taxasEmReais = preco * (taxasTotaisPct / 100);
    const lucroLiquido = preco - taxasEmReais - custoTotal;

    return {
      rotulo,
      margemPct: r2(margemPct),
      preco: r2(preco),
      lucroLiquido: r2(lucroLiquido),
      margemRealPct: preco > 0 ? r2((lucroLiquido / preco) * 100) : 0,
      markupRealPct: custoTotal > 0 ? r2((lucroLiquido / custoTotal) * 100) : 0,
      taxasEmReais: r2(taxasEmReais),
    };
  };

  const alvo = e.comercial.margemPct;
  const faixas =
    modo === "MARKUP"
      ? {
          minimo: faixa("Mínimo (não dá prejuízo)", Math.min(MARKUP_MINIMO_PCT, alvo)),
          ideal: faixa("Ideal", alvo),
          premium: faixa("Premium", r2(alvo * PREMIUM_FATOR)),
        }
      : {
          minimo: faixa("Mínimo (não dá prejuízo)", Math.min(15, alvo)),
          ideal: faixa("Ideal", alvo),
          premium: faixa("Premium", alvo + 15),
        };

  // ── 12. Métricas de produtividade ───────────────────────────
  const ganhoPorHoraMaquina =
    e.horasImpressao > 0 ? r2(faixas.ideal.lucroLiquido / e.horasImpressao) : 0;
  const ganhoPorHoraHumana =
    horasHumanas > 0 ? r2(faixas.ideal.lucroLiquido / horasHumanas) : 0;

  // ── 13. Avisos ──────────────────────────────────────────────
  if (taxasTotaisPct >= 40) {
    avisos.push({
      nivel: "atencao",
      texto: `Suas taxas somam ${r2(taxasTotaisPct)}%. Isso engole quase metade do preço — vale conferir se compensa esse canal de venda.`,
    });
  }
  if (modo === "MARGEM_LIQUIDA" && e.comercial.margemPct + taxasTotaisPct > TETO_MARGEM_MAIS_TAXAS) {
    avisos.push({
      nivel: "critico",
      texto: `Margem líquida + taxas passam de ${TETO_MARGEM_MAIS_TAXAS}%. Limitei o cálculo, mas revise: nesse patamar o preço dispara e ninguém compra.`,
    });
  }

  // Onde o dinheiro realmente vai — costuma ser a mão de obra, e quase ninguém percebe
  const maior = [...linhas].sort((a, b) => b.valor - a.valor)[0];
  if (maior && custoTotal > 0 && maior.valor / custoTotal >= 0.4) {
    avisos.push({
      nivel: "info",
      texto: `${maior.rotulo} responde por ${Math.round((maior.valor / custoTotal) * 100)}% do custo desta peça. É aí que mexer muda o preço.`,
    });
  }
  if (risco.nivel === "ALTO" || risco.nivel === "MUITO_ALTO") {
    avisos.push({
      nivel: "atencao",
      texto: `Risco ${risco.nivel === "ALTO" ? "alto" : "muito alto"} (score ${risco.score}). Já reservei R$ ${r2(reservaRefugo)} pra cobrir refugo — sem isso, uma falha come o lucro de várias peças.`,
    });
  }
  if (!e.impressora) {
    avisos.push({
      nivel: "critico",
      texto: "Nenhuma impressora selecionada — energia e depreciação ficaram de fora e o custo está subestimado.",
    });
  }
  if (e.tarifaKwh <= 0) {
    avisos.push({
      nivel: "atencao",
      texto: "Sem tarifa de energia cadastrada. Lance uma conta de luz para o R$/kWh sair do valor real.",
    });
  }
  if (horasHumanas === 0) {
    avisos.push({
      nivel: "atencao",
      texto: "Nenhuma hora de trabalho lançada. O tempo dele é o custo mais esquecido — inclua nem que seja o preparo.",
    });
  }
  if (ganhoPorHoraMaquina > 0 && ganhoPorHoraMaquina < 2) {
    avisos.push({
      nivel: "atencao",
      texto: `No preço ideal, a impressora rende R$ ${ganhoPorHoraMaquina}/h. É pouco: ocupar a máquina ${e.horasImpressao} h por isso pode não valer a pena.`,
    });
  }

  return {
    linhas: linhas.map((l) => ({
      ...l,
      participacaoPct: custoTotal > 0 ? r2((l.valor / custoTotal) * 100) : 0,
    })),
    custoDireto: r2(custoDireto),
    reservaRefugo: r2(reservaRefugo),
    custoTotal,
    risco,
    modoMargem: modo,
    taxasTotaisPct: r2(taxasTotaisPct),
    faixas,
    horasImpressao: e.horasImpressao,
    horasHumanas: r2(horasHumanas),
    ganhoPorHoraMaquina,
    ganhoPorHoraHumana,
    avisos,
  };
}

/** Quanto sobra de fato se ele vender por um preço qualquer. */
export function analisarPreco(resultado: ResultadoPrecificacao, preco: number) {
  const recebido = preco * (1 - resultado.taxasTotaisPct / 100);
  const lucro = recebido - resultado.custoTotal;
  const margem = preco > 0 ? (lucro / preco) * 100 : 0;
  return {
    preco: r2(preco),
    recebido: r2(recebido),
    lucro: r2(lucro),
    margemPct: r2(margem),
    prejuizo: lucro < 0,
    abaixoDoMinimo: preco < resultado.faixas.minimo.preco,
  };
}
