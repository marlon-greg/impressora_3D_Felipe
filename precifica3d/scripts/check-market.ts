/** Testa os coletores de mercado de verdade. Rode com: npm run check:market */
import { coletarTudo } from "../src/server/market/runner";
import { valoresAtuais, precoMercadoFilamento } from "../src/server/market/read";

async function main() {
  const r = await coletarTudo({ forcar: true });

  console.log("\n=== EXECUÇÃO ===");
  for (const x of r.resultados) {
    console.log(
      `  ${x.status.padEnd(7)} ${x.nome.padEnd(34)} ${String(x.itens).padStart(3)} itens  ${String(x.duracaoMs).padStart(5)}ms  ${(x.mensagem ?? "").slice(0, 90)}`,
    );
  }
  console.log(`\n  ${r.ok} ok · ${r.falhas} falhas · ${r.duracaoMs}ms no total`);

  console.log("\n=== O QUE O APP LÊ DO CACHE ===");
  const v = await valoresAtuais([
    "USD-BRL",
    "EUR-BRL",
    "IPCA",
    "IGPM",
    "PETG-MEDIA-KG",
    "PLA-MEDIA-KG",
  ]);
  for (const [k, x] of Object.entries(v)) {
    console.log(`  ${k.padEnd(16)} ${String(x.valor).padStart(9)} ${x.unidade ?? ""}`);
  }

  console.log("\n=== PETG NO MERCADO ===");
  const petg = await precoMercadoFilamento("PETG");
  if (petg) {
    console.log(`  mediana   R$ ${petg.medianaPorKg}/kg`);
    console.log(`  faixa     R$ ${petg.minimo?.toFixed(2)} — R$ ${petg.maximo?.toFixed(2)}`);
    console.log(`  amostras  ${petg.amostras} produtos em ${petg.lojas.join(", ")}`);
  } else {
    console.log("  sem dado");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
