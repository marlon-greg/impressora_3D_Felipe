/**
 * Estado compartilhado dos formulários de acesso.
 *
 * Mora fora de `actions.ts` de propósito: um arquivo "use server" só pode
 * exportar funções async. Uma constante exportada de lá quebra o build.
 */

export interface EstadoForm {
  ok: boolean;
  mensagem: string;
  campos?: Record<string, string>;
  /** em modo console, o link que sairia por e-mail aparece na tela */
  linkDev?: string;
}

export const VAZIO: EstadoForm = { ok: false, mensagem: "" };
