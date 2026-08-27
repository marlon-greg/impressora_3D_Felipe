import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

/**
 * Hash de senha com scrypt (nativo do Node, recomendado pela OWASP).
 *
 * Por que scrypt e não bcryptjs: bcryptjs é JavaScript puro e trava o event
 * loop por centenas de ms a cada login. scrypt é nativo, assíncrono e
 * memory-hard — encarece o ataque com GPU, que é o cenário real de quem
 * rouba um dump de banco.
 *
 * Formato guardado: scrypt$N$r$p$salt_b64$hash_b64
 * O N/r/p vão junto no registro, então dá pra endurecer os parâmetros no
 * futuro sem invalidar as senhas já existentes.
 */

const N = 2 ** 16; // custo de CPU/memória (~64 MB por hash)
const r = 8;
const p = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;
const MAXMEM = 128 * N * r * 2;

export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derivada = (await scrypt(senha.normalize("NFKC"), salt, KEYLEN, {
    N,
    r,
    p,
    maxmem: MAXMEM,
  })) as Buffer;

  return ["scrypt", N, r, p, salt.toString("base64"), derivada.toString("base64")].join("$");
}

export async function verificarSenha(senha: string, registro: string): Promise<boolean> {
  try {
    const partes = registro.split("$");
    if (partes.length !== 6 || partes[0] !== "scrypt") return false;

    const [, nStr, rStr, pStr, saltB64, hashB64] = partes;
    const salt = Buffer.from(saltB64, "base64");
    const esperado = Buffer.from(hashB64, "base64");

    const derivada = (await scrypt(senha.normalize("NFKC"), salt, esperado.length, {
      N: Number(nStr),
      r: Number(rStr),
      p: Number(pStr),
      maxmem: MAXMEM,
    })) as Buffer;

    // comparação em tempo constante — comparar com === vaza informação pelo tempo
    return derivada.length === esperado.length && timingSafeEqual(derivada, esperado);
  } catch {
    return false;
  }
}

/** true quando o hash foi gerado com parâmetros mais fracos e vale re-hashear no próximo login. */
export function precisaRehash(registro: string): boolean {
  const partes = registro.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return true;
  return Number(partes[1]) < N || Number(partes[2]) < r || Number(partes[3]) < p;
}
