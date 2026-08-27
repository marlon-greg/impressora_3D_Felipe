/**
 * Normalização de e-mail — domínio puro.
 *
 * Serve para uma coisa só: impedir que a mesma pessoa crie duas contas
 * escrevendo o endereço de um jeito diferente. O campo `email` guarda o que
 * ela digitou (é o que aparece na tela e recebe a mensagem); o campo
 * `emailNormalizado` é a chave única de verdade.
 */

/** Provedores que ignoram pontos e tratam +tag como alias da mesma caixa. */
const COM_ALIAS_E_PONTO = new Set(["gmail.com", "googlemail.com"]);
/** Provedores que ignoram só o +tag. */
const COM_ALIAS = new Set([
  "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "yahoo.com.br", "proton.me", "protonmail.com",
  "icloud.com", "me.com", "fastmail.com", "zoho.com",
]);

export function normalizarEmail(email: string): string {
  const limpo = email.trim().toLowerCase();
  const arroba = limpo.lastIndexOf("@");
  if (arroba <= 0) return limpo;

  let usuario = limpo.slice(0, arroba);
  let dominio = limpo.slice(arroba + 1);

  if (dominio === "googlemail.com") dominio = "gmail.com";

  if (COM_ALIAS_E_PONTO.has(dominio)) {
    usuario = usuario.split("+")[0].replace(/\./g, "");
  } else if (COM_ALIAS.has(dominio)) {
    usuario = usuario.split("+")[0];
  }

  return `${usuario}@${dominio}`;
}

/**
 * Validação de formato. Deliberadamente permissiva: a regra que realmente
 * confirma um endereço é o e-mail chegar, não uma regex barroca. Regex
 * apertada demais rejeita endereço válido de gente real.
 */
const FORMATO = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function emailValido(email: string): boolean {
  const e = email.trim();
  return e.length >= 6 && e.length <= 254 && FORMATO.test(e);
}

/** Só o domínio, para checagens e telemetria sem expor o endereço inteiro. */
export const dominioDe = (email: string) => email.trim().toLowerCase().split("@")[1] ?? "";

/** Mascara para log e tela de confirmação: `fe****pe@gmail.com`. */
export function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!dominio) return "***";
  if (usuario.length <= 2) return `${usuario[0]}***@${dominio}`;
  const visivel = Math.min(2, Math.floor(usuario.length / 3));
  return `${usuario.slice(0, visivel)}${"*".repeat(4)}${usuario.slice(-visivel)}@${dominio}`;
}
