/**
 * Nome do cookie de sessão, isolado num módulo sem I/O.
 *
 * O `proxy.ts` precisa dele e roda fora do Node completo — se importasse
 * `session.ts`, arrastaria junto Prisma e `server-only`, que não sobem lá.
 */
export const COOKIE_SESSAO = "p3d_sessao";
