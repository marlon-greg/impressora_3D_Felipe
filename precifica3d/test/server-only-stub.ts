/**
 * Substituto do pacote `server-only` durante os testes.
 *
 * Aquele pacote lança de propósito quando é importado fora de um Server
 * Component — é a barreira que impede código de servidor de vazar para o
 * navegador. No Vitest não existe navegador, então trocamos por um módulo
 * vazio em vez de reconfigurar a resolução do Vite, que quebrava o interop do
 * driver `pg` (CommonJS).
 */
export {};
