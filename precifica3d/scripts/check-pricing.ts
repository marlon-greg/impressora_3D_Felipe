/** Sanidade do motor de cálculo. Rode com: npx tsx scripts/check-pricing.ts */
import { precificar, analisarPreco, type EntradaPrecificacao } from "../src/core/pricing/calculator";

const cenario: EntradaPrecificacao = {
  impressora: {
    nome: "Kobra X",
    valorPago: 2200,
    vidaUtilHoras: 6000,
    manutencaoAnual: 300,
    horasUsoAnual: 1200,
    potenciaWatts: 180,
  },
  tarifaKwh: 0.98,
  horasImpressao: 7.5,
  custoArquivo: 0,
  filamentos: [
    {
      materialId: "f1",
      nome: "PETG Masterprint Preto",
      gramas: 120,
      desperdicioPct: 8,
      precoEmbalagem: 135,
      tamanhoEmbalagem: 1000,
    },
  ],
  materiais: [
    {
      materialId: "m1",
      nome: "Primer",
      categoria: "PRIMER",
      unidade: "ML",
      quantidade: 12,
      precoEmbalagem: 45,
      tamanhoEmbalagem: 250,
    },
    {
      materialId: "m2",
      nome: "Tinta Acrilex 37ml",
      categoria: "TINTA",
      unidade: "ML",
      quantidade: 9,
      precoEmbalagem: 7.5,
      tamanhoEmbalagem: 37,
    },
    {
      materialId: "m3",
      nome: "Verniz",
      categoria: "VERNIZ",
      unidade: "ML",
      quantidade: 8,
      precoEmbalagem: 52,
      tamanhoEmbalagem: 250,
    },
  ],
  trabalhos: [
    { descricao: "Preparo/fatiamento", horas: 0.4, valorHora: 25, antesDaImpressao: true },
    { descricao: "Lixamento", horas: 0.5, valorHora: 25 },
    { descricao: "Pintura", horas: 1.5, valorHora: 35 },
  ],
  complexidade: {
    precisaSuporte: true,
    paredesFinas: false,
    pecasMoveis: false,
    multiCor: false,
    encaixePreciso: true,
    impressaoAlta: false,
    numeroPecas: 2,
    horasImpressao: 7.5,
    maiorDimensaoMm: 140,
    refugoManualPct: null,
  },
  comercial: {
    modoMargem: "MARKUP",
    margemPct: 60,
    taxaCanalPct: 14,
    taxaPagamentoPct: 0,
    impostoPct: 0,
    embalagemCusto: 3.5,
    freteEmbutido: 0,
  },
  custoIndiretoMensal: 150,
  horasProdutivasMes: 80,
};

const r = precificar(cenario);

console.log("\n=== CUSTOS ===");
for (const l of r.linhas) {
  console.log(
    `  ${l.rotulo.padEnd(34)} R$ ${l.valor.toFixed(2).padStart(8)}  ${String(l.participacaoPct).padStart(5)}%  ${l.detalhe ?? ""}`,
  );
}
console.log(`  ${"CUSTO TOTAL".padEnd(34)} R$ ${r.custoTotal.toFixed(2).padStart(8)}`);

console.log("\n=== RISCO ===");
console.log(`  score ${r.risco.score} (${r.risco.nivel}) → refugo ${r.risco.taxaFalhaImpressaoPct}% impressão / ${r.risco.taxaFalhaAcabamentoPct}% acabamento`);
r.risco.fatores.forEach((f) => console.log(`   - ${f}`));

console.log(`\n=== PREÇO — modo ${r.modoMargem}, taxas totais ${r.taxasTotaisPct}% ===`);
for (const f of [r.faixas.minimo, r.faixas.ideal, r.faixas.premium]) {
  console.log(
    `  ${f.rotulo.padEnd(26)} R$ ${f.preco.toFixed(2).padStart(8)}  taxas R$ ${f.taxasEmReais.toFixed(2).padStart(6)}  → lucro R$ ${f.lucroLiquido.toFixed(2).padStart(7)} (markup ${f.markupRealPct}% / margem ${f.margemRealPct}%)`,
  );
}

console.log("\n=== PRODUTIVIDADE ===");
console.log(`  ${r.horasImpressao} h de máquina → R$ ${r.ganhoPorHoraMaquina}/h`);
console.log(`  ${r.horasHumanas} h de trabalho → R$ ${r.ganhoPorHoraHumana}/h`);

console.log("\n=== SE VENDER POR R$ 90 ===");
console.log(" ", analisarPreco(r, 90));

console.log("\n=== AVISOS ===");
r.avisos.forEach((a) => console.log(`  [${a.nivel}] ${a.texto}`));

// ── verificações ────────────────────────────────────────────
const erros: string[] = [];
const soma = r.linhas.reduce((s, l) => s + l.valor, 0);
if (Math.abs(soma - r.custoTotal) > 0.05) erros.push(`soma das linhas (${soma}) != custoTotal (${r.custoTotal})`);

const ideal = r.faixas.ideal;
const recebido = ideal.preco * (1 - r.taxasTotaisPct / 100);
if (Math.abs(recebido - r.custoTotal - ideal.lucroLiquido) > 0.05) erros.push("lucro do ideal não fecha");
// modo MARKUP com 60%: o lucro tem que ser 60% do custo
if (Math.abs(ideal.markupRealPct - 60) > 0.6) erros.push(`markup real deveria ser ~60%, veio ${ideal.markupRealPct}`);
if (!(r.faixas.minimo.preco < ideal.preco && ideal.preco < r.faixas.premium.preco)) erros.push("faixas fora de ordem");
if (r.faixas.minimo.lucroLiquido <= 0) erros.push("faixa mínima não deveria dar prejuízo");

// esquecer a taxa (custo × 1.6) deixa o preço ABAIXO do correto — é o erro que o sistema evita
const ingenuo = r.custoTotal * 1.6;
if (ingenuo >= ideal.preco) erros.push("preço ingênuo deveria ficar abaixo do preço correto");
console.log(
  `  preço ingênuo (custo × 1,6, ignorando taxa): R$ ${ingenuo.toFixed(2)} — R$ ${(ideal.preco - ingenuo).toFixed(2)} a menos do que deveria`,
);

// modo MARGEM_LIQUIDA com o mesmo número tem que dar um preço MAIOR
const rML = precificar({ ...cenario, comercial: { ...cenario.comercial, modoMargem: "MARGEM_LIQUIDA" } });
if (rML.faixas.ideal.preco <= ideal.preco) erros.push("margem líquida 60% deveria custar mais que markup 60%");
if (Math.abs(rML.faixas.ideal.margemRealPct - 60) > 0.6)
  erros.push(`margem líquida real deveria ser ~60%, veio ${rML.faixas.ideal.margemRealPct}`);
console.log(
  `  mesmo 60% em MARGEM_LIQUIDA: R$ ${rML.faixas.ideal.preco.toFixed(2)} (vs R$ ${ideal.preco.toFixed(2)} em MARKUP)`,
);

// sem taxa nenhuma, markup puro tem que bater exatamente custo × 1,6
const rSemTaxa = precificar({
  ...cenario,
  comercial: { ...cenario.comercial, taxaCanalPct: 0, taxaPagamentoPct: 0, impostoPct: 0 },
});
if (Math.abs(rSemTaxa.faixas.ideal.preco - rSemTaxa.custoTotal * 1.6) > 0.05)
  erros.push("sem taxas, markup 60% deveria dar exatamente custo × 1,6");

console.log("\n=== CHECAGEM ===");
if (erros.length === 0) console.log("  OK — todas as verificações passaram");
else {
  erros.forEach((e) => console.log("  FALHOU: " + e));
  process.exit(1);
}
