import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Dois tipos de teste convivem aqui:
 *
 *   • domínio puro (preço, senha, tokens, validação) — roda sempre, em
 *     milissegundos, sem banco nem rede;
 *   • integração (`*.integracao.test.ts`) — precisa do `npm run db:dev` de pé
 *     e se pula sozinho quando o banco não responde.
 *
 * Módulos marcados com `server-only` são importáveis aqui porque aquele
 * pacote é trocado por um stub — ver test/server-only-stub.ts.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.mts"],
    // as de integração compartilham o mesmo banco; em paralelo elas
    // atrapalhariam umas às outras
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      // ver o comentário em test/server-only-stub.ts
      "server-only": resolve(import.meta.dirname, "./test/server-only-stub.ts"),
    },
  },
});
