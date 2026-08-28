import { describe, it, expect } from "vitest";

import { precificar, calcularRisco, analisarPreco, custoPorUnidade } from "./calculator";
import type { EntradaPrecificacao } from "./calculator";

/**
 * O motor de preço é o coração do produto: se ele errar, o Felipe vende no
 * prejuízo sem perceber. Estes testes existem para travar o comportamento
 * que já custou caro descobrir.
 */

const base = (): EntradaPrecificacao => ({
  impressora: {
    nome: "Kobra X",
    valorPago: 2200,
    vidaUtilHoras: 6000,
    manutencaoAnual: 400,
    horasUsoAnual: 1200,
    potenciaWatts: 180,
  },
  tarifaKwh: 0.95,
  horasImpressao: 10,
  custoArquivo: 0,
  filamentos: [
    {
      materialId: "f1",
      nome: "PETG",
      gramas: 100,
      desperdicioPct: 0,
      precoEmbalagem: 100,
      tamanhoEmbalagem: 1000,
    },
  ],
  materiais: [],
  trabalhos: [{ descricao: "Pintura", horas: 1, valorHora: 30 }],
  complexidade: {
    precisaSuporte: false,
    paredesFinas: false,
    pecasMoveis: false,
    multiCor: false,
    encaixePreciso: false,
    impressaoAlta: false,
    numeroPecas: 1,
    horasImpressao: 10,
    maiorDimensaoMm: null,
    refugoManualPct: null,
  },
  comercial: {
    modoMargem: "MARKUP",
    margemPct: 60,
    taxaCanalPct: 0,
    taxaPagamentoPct: 0,
    impostoPct: 0,
    embalagemCusto: 0,
    freteEmbutido: 0,
  },
  custoIndiretoMensal: 0,
  horasProdutivasMes: 80,
});

describe("custoPorUnidade", () => {
  it("divide o preço da embalagem pelo tamanho", () => {
    expect(custoPorUnidade(100, 1000)).toBeCloseTo(0.1);
  });

  it("devolve zero em vez de dividir por zero", () => {
    expect(custoPorUnidade(100, 0)).toBe(0);
  });
});

describe("markup x margem líquida", () => {
  it("markup de 60% põe 60% em cima do custo", () => {
    const r = precificar(base());
    expect(r.faixas.ideal.preco).toBeCloseTo(r.custoTotal * 1.6, 1);
  });

  it("margem líquida de 60% faz o lucro ser 60% do PREÇO, não do custo", () => {
    const e = base();
    e.comercial.modoMargem = "MARGEM_LIQUIDA";
    const r = precificar(e);
    expect(r.faixas.ideal.margemRealPct).toBeCloseTo(60, 0);
    // é o erro nº 1 de quem vende 3D: 60% de margem líquida custa 2,5× o custo,
    // não 1,6× como o markup
    expect(r.faixas.ideal.preco).toBeCloseTo(r.custoTotal / 0.4, 1);
  });
});

describe("taxas saem por cima do preço", () => {
  it("o que sobra depois da taxa continua sendo o lucro planejado", () => {
    const e = base();
    e.comercial.taxaCanalPct = 15;
    const r = precificar(e);

    const recebido = r.faixas.ideal.preco * 0.85;
    expect(recebido - r.custoTotal).toBeCloseTo(r.faixas.ideal.lucroLiquido, 1);
    // somar a taxa à margem daria preço menor e comeria o lucro
    expect(r.faixas.ideal.preco).toBeGreaterThan(r.custoTotal * 1.6);
  });
});

describe("reserva de refugo", () => {
  it("peça arriscada reserva mais que peça simples", () => {
    const simples = precificar(base());

    const e = base();
    e.complexidade.paredesFinas = true;
    e.complexidade.pecasMoveis = true;
    e.complexidade.encaixePreciso = true;
    e.horasImpressao = 30;
    e.complexidade.horasImpressao = 30;
    const arriscada = precificar(e);

    expect(arriscada.risco.score).toBeGreaterThan(simples.risco.score);
    expect(arriscada.reservaRefugo).toBeGreaterThan(simples.reservaRefugo);
  });

  it("sem refugo manual, a reserva é calculada e é maior que zero", () => {
    const r = precificar(base());
    expect(r.risco.manual).toBe(false);
    expect(r.reservaRefugo).toBeGreaterThan(0);
    expect(r.linhas.some((l) => l.chave === "refugo")).toBe(true);
  });

  it("refugo manual de 0% é respeitado e zera a reserva", () => {
    const e = base();
    e.complexidade.refugoManualPct = 0;
    const r = precificar(e);
    expect(r.risco.manual).toBe(true);
    expect(r.reservaRefugo).toBe(0);
  });

  it("o trabalho feito antes de imprimir não entra na reserva de refugo", () => {
    const antes = base();
    antes.trabalhos = [{ descricao: "Modelagem", horas: 5, valorHora: 40, antesDaImpressao: true }];

    const depois = base();
    depois.trabalhos = [{ descricao: "Pintura", horas: 5, valorHora: 40, antesDaImpressao: false }];

    // modelagem já feita não se perde quando a impressão falha; pintura sim
    expect(precificar(depois).reservaRefugo).toBeGreaterThan(precificar(antes).reservaRefugo);
  });
});

describe("desperdício de filamento", () => {
  it("purga e brim entram no custo do plástico", () => {
    const e = base();
    e.filamentos[0].desperdicioPct = 20;
    const r = precificar(e);
    const linha = r.linhas.find((l) => l.chave === "filamento")!;
    expect(linha.valor).toBeCloseTo(12, 1); // 100 g + 20% a R$ 0,10/g
  });
});

describe("analisarPreco", () => {
  it("aponta prejuízo quando o preço não cobre o custo", () => {
    const r = precificar(base());
    const a = analisarPreco(r, r.custoTotal * 0.5);
    expect(a.prejuizo).toBe(true);
    expect(a.abaixoDoMinimo).toBe(true);
  });

  it("desconta as taxas do que ele recebe de fato", () => {
    const e = base();
    e.comercial.taxaCanalPct = 10;
    e.comercial.taxaPagamentoPct = 5;
    const r = precificar(e);
    const a = analisarPreco(r, 100);
    expect(a.recebido).toBeCloseTo(85, 1);
  });
});

describe("avisos", () => {
  it("avisa quando falta impressora — energia e depreciação ficam de fora", () => {
    const e = base();
    e.impressora = null;
    const r = precificar(e);
    expect(r.avisos.some((a) => a.nivel === "critico" && /impressora/i.test(a.texto))).toBe(true);
  });

  it("avisa quando o preço do material é estimado", () => {
    const e = base();
    e.filamentos[0].precoEstimado = true;
    const r = precificar(e);
    expect(r.avisos.some((a) => /estimativa/i.test(a.texto))).toBe(true);
  });

  it("aponta o item que domina o custo", () => {
    const e = base();
    e.trabalhos = [{ descricao: "Pintura", horas: 20, valorHora: 50 }];
    const r = precificar(e);
    expect(r.avisos.some((a) => /Mão de obra responde por/.test(a.texto))).toBe(true);
  });
});

describe("calcularRisco", () => {
  it("cresce com o tempo de impressão", () => {
    const curto = calcularRisco({ ...base().complexidade, horasImpressao: 2 });
    const longo = calcularRisco({ ...base().complexidade, horasImpressao: 35 });
    expect(longo.score).toBeGreaterThan(curto.score);
  });

  it("nunca passa de 100", () => {
    const tudo = calcularRisco({
      precisaSuporte: true,
      paredesFinas: true,
      pecasMoveis: true,
      multiCor: true,
      encaixePreciso: true,
      impressaoAlta: true,
      numeroPecas: 20,
      horasImpressao: 100,
      maiorDimensaoMm: 400,
      refugoManualPct: null,
    });
    expect(tudo.score).toBeLessThanOrEqual(100);
  });
});
