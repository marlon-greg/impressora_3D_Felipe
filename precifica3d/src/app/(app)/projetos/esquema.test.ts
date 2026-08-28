import { describe, it, expect } from "vitest";

import { esquema } from "./esquema";

/**
 * O rascunho vem do navegador como JSON. Estes testes cuidam da borda entre
 * "o que o formulário mandou" e "o que o motor de preço recebe" — onde um
 * null virando 0 já apagou silenciosamente a reserva de refugo de uma peça.
 */

const minimo = {
  nome: "Peça de teste",
  origemArquivo: "PRONTO",
  custoArquivo: 0,
  horasImpressao: 5,
  numeroPecas: 1,
  horasPreparo: 0,
  precisaSuporte: false,
  paredesFinas: false,
  pecasMoveis: false,
  multiCor: false,
  encaixePreciso: false,
  impressaoAlta: false,
  fazLixamento: false,
  fazPrimer: false,
  fazPintura: false,
  fazVerniz: false,
  fazMontagem: false,
  modoMargem: "MARKUP",
  margemPct: 60,
  taxaCanalPct: 0,
  taxaPagamentoPct: 0,
  impostoPct: 0,
  embalagemCusto: 0,
  freteEmbutido: 0,
};

describe("campos numéricos opcionais", () => {
  it("null continua null e NÃO vira zero", () => {
    const r = esquema.parse({ ...minimo, refugoManualPct: null, larguraMm: null });
    // z.coerce.number() converteria null em 0, e o motor leria isso como
    // "refugo fixado em 0%", desligando a reserva de quebra
    expect(r.refugoManualPct).toBeNull();
    expect(r.larguraMm).toBeNull();
  });

  it("campo ausente também vira null", () => {
    const r = esquema.parse(minimo);
    expect(r.refugoManualPct).toBeNull();
    expect(r.alturaMm).toBeNull();
  });

  it("zero informado de propósito continua zero", () => {
    const r = esquema.parse({ ...minimo, refugoManualPct: 0 });
    expect(r.refugoManualPct).toBe(0);
  });

  it("aceita número em texto, como vem do input", () => {
    const r = esquema.parse({ ...minimo, refugoManualPct: "12.5" });
    expect(r.refugoManualPct).toBe(12.5);
  });
});

describe("regras de negócio", () => {
  it("recusa peça sem nome", () => {
    expect(esquema.safeParse({ ...minimo, nome: "x" }).success).toBe(false);
  });

  it("recusa taxa acima de 99% — o preço iria ao infinito", () => {
    expect(esquema.safeParse({ ...minimo, taxaCanalPct: 100 }).success).toBe(false);
  });

  it("recusa horas de impressão negativas", () => {
    expect(esquema.safeParse({ ...minimo, horasImpressao: -1 }).success).toBe(false);
  });

  it("exige ao menos uma parte impressa", () => {
    expect(esquema.safeParse({ ...minimo, numeroPecas: 0 }).success).toBe(false);
  });

  it("listas ausentes viram listas vazias", () => {
    const r = esquema.parse(minimo);
    expect(r.filamentos).toEqual([]);
    expect(r.materiais).toEqual([]);
    expect(r.trabalhos).toEqual([]);
  });

  it("aceita desperdício de 0 a 100% e recusa acima", () => {
    const ok = esquema.safeParse({
      ...minimo,
      filamentos: [{ materialId: "m1", gramas: 10, desperdicioPct: 100 }],
    });
    const nao = esquema.safeParse({
      ...minimo,
      filamentos: [{ materialId: "m1", gramas: 10, desperdicioPct: 101 }],
    });
    expect(ok.success).toBe(true);
    expect(nao.success).toBe(false);
  });
});
