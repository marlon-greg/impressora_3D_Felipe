import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Tokens de sessão, verificação de e-mail e reset de senha.
 *
 * Regra: o banco guarda só o HASH do token. O valor bruto existe apenas no
 * cookie do usuário ou no link do e-mail. Se o banco vazar, ninguém consegue
 * entrar em conta nenhuma nem resetar senha de terceiro.
 *
 * SHA-256 puro basta aqui (diferente de senha) porque o token tem 256 bits de
 * aleatoriedade real — não existe dicionário para atacar isso.
 */

const TOKEN_BYTES = 32;

/** base64url — cabe em URL e cookie sem escapar nada */
const b64url = (b: Buffer) => b.toString("base64url");

export function gerarToken(): { bruto: string; hash: string } {
  const bruto = b64url(randomBytes(TOKEN_BYTES));
  return { bruto, hash: hashToken(bruto) };
}

export function hashToken(bruto: string): string {
  return createHash("sha256").update(bruto).digest("hex");
}

/** Comparação em tempo constante entre dois hashes hex. */
export function tokensIguais(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}

/** Código numérico de 6 dígitos, para confirmação por e-mail sem clicar em link. */
export function gerarCodigo(digitos = 6): string {
  const max = 10 ** digitos;
  let n: number;
  // rejeita valores fora da faixa para não enviesar os dígitos
  const limite = Math.floor(0xffffffff / max) * max;
  do {
    n = randomBytes(4).readUInt32BE(0);
  } while (n >= limite);
  return String(n % max).padStart(digitos, "0");
}

export const VALIDADE = {
  /** sessão normal: 7 dias, renovada a cada uso */
  SESSAO_MS: 7 * 24 * 60 * 60 * 1000,
  /** "continuar conectado": 30 dias */
  SESSAO_LONGA_MS: 30 * 24 * 60 * 60 * 1000,
  /** link de verificação de e-mail: 24 h */
  VERIFICAR_EMAIL_MS: 24 * 60 * 60 * 1000,
  /** reset de senha: 1 h — janela curta reduz muito a superfície de ataque */
  RESETAR_SENHA_MS: 60 * 60 * 1000,
  /** convite criado pelo admin: 7 dias */
  CONVITE_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

export const expiraEm = (ms: number) => new Date(Date.now() + ms);
