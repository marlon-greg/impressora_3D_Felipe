import { createHash } from "node:crypto";

/**
 * Verifica se a senha aparece em vazamentos conhecidos, usando a API
 * gratuita do Have I Been Pwned com k-anonymity.
 *
 * A senha NUNCA sai daqui. Enviamos apenas os 5 primeiros caracteres do
 * SHA-1; o serviço devolve todos os sufixos que começam com esse prefixo
 * (uns 800) e a comparação acontece localmente. Nem a HIBP sabe qual senha
 * foi consultada.
 *
 * Sem chave de API, sem custo, sem limite prático.
 */

const ENDPOINT = "https://api.pwnedpasswords.com/range/";
const TIMEOUT_MS = 4000;

export interface ResultadoVazamento {
  vazada: boolean;
  /** quantas vezes apareceu em vazamentos; 0 se limpa */
  ocorrencias: number;
  /** true quando não deu pra consultar (rede fora) — não bloqueia o cadastro */
  indisponivel: boolean;
}

export async function verificarVazamento(senha: string): Promise<ResultadoVazamento> {
  const sha1 = createHash("sha1").update(senha.normalize("NFKC")).digest("hex").toUpperCase();
  const prefixo = sha1.slice(0, 5);
  const sufixo = sha1.slice(5);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT + prefixo, {
      signal: ctrl.signal,
      // enche a resposta com linhas falsas pra ninguém inferir nada pelo tamanho
      headers: { "Add-Padding": "true", "User-Agent": "Precifica3D" },
      cache: "no-store",
    });
    if (!res.ok) return { vazada: false, ocorrencias: 0, indisponivel: true };

    const corpo = await res.text();
    for (const linha of corpo.split("\n")) {
      const [hash, qtd] = linha.trim().split(":");
      if (hash === sufixo) {
        const ocorrencias = Number(qtd) || 0;
        // o padding vem com contagem 0 — essas linhas são ruído proposital
        if (ocorrencias === 0) continue;
        return { vazada: true, ocorrencias, indisponivel: false };
      }
    }
    return { vazada: false, ocorrencias: 0, indisponivel: false };
  } catch {
    // rede fora não pode impedir alguém de criar conta
    return { vazada: false, ocorrencias: 0, indisponivel: true };
  } finally {
    clearTimeout(t);
  }
}

export function mensagemVazamento(r: ResultadoVazamento): string | null {
  if (!r.vazada) return null;
  const n = r.ocorrencias.toLocaleString("pt-BR");
  return `Essa senha já apareceu em ${n} vazamento${r.ocorrencias > 1 ? "s" : ""} de dados. Invasores testam essas senhas primeiro — escolha outra.`;
}
