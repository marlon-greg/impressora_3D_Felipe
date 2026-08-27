/**
 * Política de senha — domínio puro, roda igual no servidor e no navegador.
 *
 * Baseada na NIST SP 800-63B, que é o que órgão sério recomenda hoje:
 * comprimento vale mais que "caractere especial obrigatório", e senha
 * conhecida em vazamento tem que ser barrada por mais bonita que pareça.
 *
 * A validação do SERVIDOR é a que manda. A do navegador é só conforto.
 */

export const SENHA_MIN = 10;
export const SENHA_MAX = 128;

/**
 * Senhas campeãs de vazamento e de teclado. Lista curta de propósito:
 * a verificação séria contra vazamentos é a do HIBP (k-anonymity),
 * feita no servidor em src/server/auth/pwned.ts.
 */
const PROIBIDAS = new Set([
  "123456", "1234567", "12345678", "123456789", "1234567890", "12345678910",
  "senha123", "senha1234", "minhasenha", "password", "password1", "password123",
  "qwerty", "qwerty123", "asdfghjkl", "1q2w3e4r", "abc12345", "admin123",
  "brasil123", "flamengo", "corinthians", "palmeiras", "saopaulo",
  "impressora3d", "impressao3d", "felipe123", "mudar123", "trocar123",
  "iloveyou", "welcome1", "letmein", "monkey123",
]);

const SEQUENCIAS = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

export interface ForcaSenha {
  valida: boolean;
  /** 0 a 4 — o que a barrinha da tela mostra */
  score: 0 | 1 | 2 | 3 | 4;
  rotulo: "Muito fraca" | "Fraca" | "Razoável" | "Forte" | "Muito forte";
  /** o que impede de salvar */
  erros: string[];
  /** o que dá pra melhorar, mas não bloqueia */
  dicas: string[];
}

const temSequencia = (s: string) => {
  const l = s.toLowerCase();
  for (const seq of SEQUENCIAS) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const trecho = seq.slice(i, i + 4);
      if (l.includes(trecho) || l.includes([...trecho].reverse().join(""))) return true;
    }
  }
  return false;
};

const temRepeticao = (s: string) => /(.)\1{2,}/.test(s);

/** Normaliza pra comparar com a lista: remove leet e separadores. */
const desofuscar = (s: string) =>
  s
    .toLowerCase()
    .replace(/[@]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-z0-9]/g, "");

/**
 * Entropia aproximada em bits. Não é exata — é uma referência honesta
 * de quão grande é o espaço de busca de quem tenta adivinhar.
 */
export function entropiaBits(senha: string): number {
  let alfabeto = 0;
  if (/[a-z]/.test(senha)) alfabeto += 26;
  if (/[A-Z]/.test(senha)) alfabeto += 26;
  if (/[0-9]/.test(senha)) alfabeto += 10;
  if (/[^a-zA-Z0-9]/.test(senha)) alfabeto += 33;
  if (alfabeto === 0) return 0;

  let bits = senha.length * Math.log2(alfabeto);
  // repetição e sequência reduzem muito o espaço real de busca
  if (temRepeticao(senha)) bits *= 0.75;
  if (temSequencia(senha)) bits *= 0.7;
  const unicos = new Set(senha).size;
  if (unicos < senha.length * 0.5) bits *= 0.8;
  return Math.round(bits);
}

/**
 * @param contexto nome e e-mail do usuário — senha não pode conter o próprio nome
 */
export function avaliarSenha(senha: string, contexto: string[] = []): ForcaSenha {
  const erros: string[] = [];
  const dicas: string[] = [];

  if (senha.length < SENHA_MIN) {
    erros.push(`Use pelo menos ${SENHA_MIN} caracteres (tem ${senha.length}).`);
  }
  if (senha.length > SENHA_MAX) {
    erros.push(`No máximo ${SENHA_MAX} caracteres.`);
  }
  if (senha !== senha.trim()) {
    erros.push("Não pode começar nem terminar com espaço.");
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(senha)).length;
  if (classes < 3) {
    erros.push("Misture pelo menos 3 tipos: minúscula, MAIÚSCULA, número e símbolo.");
  }

  const limpa = desofuscar(senha);
  if (PROIBIDAS.has(limpa) || PROIBIDAS.has(senha.toLowerCase())) {
    erros.push("Essa senha é conhecida demais — está nas listas que os invasores testam primeiro.");
  }

  for (const c of contexto) {
    const termo = desofuscar(c.split("@")[0] ?? "");
    if (termo.length >= 4 && limpa.includes(termo)) {
      erros.push("A senha não pode conter seu nome ou e-mail.");
      break;
    }
  }

  if (temSequencia(senha)) dicas.push("Evite sequências como 1234, abcd ou qwerty.");
  if (temRepeticao(senha)) dicas.push("Evite repetir o mesmo caractere 3 vezes seguidas.");
  if (senha.length < 14) dicas.push("Senhas longas são mais seguras que senhas complicadas — considere uma frase.");

  const bits = entropiaBits(senha);
  let score: ForcaSenha["score"] = bits < 35 ? 0 : bits < 50 ? 1 : bits < 65 ? 2 : bits < 85 ? 3 : 4;
  if (erros.length > 0 && score > 1) score = 1;

  const rotulos = ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"] as const;

  // exigimos no mínimo "Razoável" para aceitar
  if (erros.length === 0 && score < 2) {
    erros.push("Senha muito previsível. Aumente o tamanho ou varie mais os caracteres.");
    score = 1;
  }

  return { valida: erros.length === 0, score, rotulo: rotulos[score], erros, dicas };
}

/** Gera senha provisória forte e legível — sem caracteres que se confundem (l/1/I, O/0). */
export function gerarSenhaForte(tamanho = 20): string {
  const minus = "abcdefghjkmnpqrstuvwxyz";
  const maius = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const simb = "!@#$%&*?+=-";
  const todos = minus + maius + nums + simb;

  const bytes = new Uint32Array(tamanho * 2);
  crypto.getRandomValues(bytes);
  let i = 0;
  const pega = (fonte: string) => fonte[bytes[i++] % fonte.length];

  // garante ao menos um de cada classe
  const chars = [pega(minus), pega(maius), pega(nums), pega(simb)];
  while (chars.length < tamanho) chars.push(pega(todos));

  // embaralha (Fisher-Yates com bytes criptográficos)
  const ordem = new Uint32Array(chars.length);
  crypto.getRandomValues(ordem);
  for (let j = chars.length - 1; j > 0; j--) {
    const k = ordem[j] % (j + 1);
    [chars[j], chars[k]] = [chars[k], chars[j]];
  }
  return chars.join("");
}
