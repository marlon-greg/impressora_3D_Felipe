import { describe, it, expect } from "vitest";

import { gerarToken, hashToken, tokensIguais, gerarCodigo, expiraEm, VALIDADE } from "./tokens";

/**
 * Os tokens são a chave de tudo: sessão, confirmação de e-mail e reset de
 * senha. Um erro aqui não aparece na tela — aparece na conta de alguém sendo
 * invadida.
 */

describe("gerarToken", () => {
  it("nunca repete", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 500; i++) vistos.add(gerarToken().bruto);
    expect(vistos.size).toBe(500);
  });

  it("cabe em URL e cookie sem escapar nada", () => {
    for (let i = 0; i < 50; i++) {
      const { bruto } = gerarToken();
      expect(bruto).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(encodeURIComponent(bruto)).toBe(bruto);
    }
  });

  it("tem 256 bits de aleatoriedade — 43 caracteres em base64url", () => {
    expect(gerarToken().bruto).toHaveLength(43);
  });

  it("devolve o hash, e o hash não é o token", () => {
    const { bruto, hash } = gerarToken();
    // é o hash que vai para o banco; se vazar, não dá para voltar ao bruto
    expect(hash).not.toBe(bruto);
    expect(hash).toBe(hashToken(bruto));
  });
});

describe("hashToken", () => {
  it("é determinístico — mesma entrada, mesmo hash", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("muda por inteiro com um caractere de diferença", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("tem tamanho fixo, independente da entrada", () => {
    expect(hashToken("a")).toHaveLength(hashToken("a".repeat(5000)).length);
  });
});

describe("tokensIguais", () => {
  it("reconhece iguais", () => {
    const h = hashToken("token-qualquer");
    expect(tokensIguais(h, h)).toBe(true);
  });

  it("recusa diferentes", () => {
    expect(tokensIguais(hashToken("a"), hashToken("b"))).toBe(false);
  });

  it("recusa tamanhos diferentes sem quebrar", () => {
    // timingSafeEqual lança se os buffers tiverem tamanhos diferentes;
    // a função precisa tratar isso antes de chamar
    expect(() => tokensIguais("curto", hashToken("longo"))).not.toThrow();
    expect(tokensIguais("curto", hashToken("longo"))).toBe(false);
  });

  it("recusa string vazia", () => {
    expect(tokensIguais("", hashToken("x"))).toBe(false);
  });
});

describe("gerarCodigo", () => {
  it("gera só dígitos, no tamanho pedido", () => {
    const c = gerarCodigo(6);
    expect(c).toMatch(/^\d{6}$/);
  });

  it("não repete com frequência suspeita", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 200; i++) vistos.add(gerarCodigo(6));
    // com 10^6 possibilidades, 200 sorteios quase nunca colidem mais de uma vez
    expect(vistos.size).toBeGreaterThan(195);
  });
});

describe("prazos de validade", () => {
  it("expiraEm devolve um instante no futuro", () => {
    const d = expiraEm(60_000);
    expect(d.getTime()).toBeGreaterThan(Date.now());
    expect(d.getTime()).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  it("um prazo já vencido fica no passado — é assim que a expiração é detectada", () => {
    expect(expiraEm(-1000).getTime()).toBeLessThan(Date.now());
  });

  it("reset de senha vale menos que verificação de e-mail", () => {
    // janela curta reduz a chance de alguém achar o link numa caixa aberta
    expect(VALIDADE.RESETAR_SENHA_MS).toBeLessThan(VALIDADE.VERIFICAR_EMAIL_MS);
  });

  it("convite dura mais que a confirmação de e-mail", () => {
    expect(VALIDADE.CONVITE_MS).toBeGreaterThan(VALIDADE.VERIFICAR_EMAIL_MS);
  });

  it("a sessão de 'continuar conectado' dura mais que a comum", () => {
    expect(VALIDADE.SESSAO_LONGA_MS).toBeGreaterThan(VALIDADE.SESSAO_MS);
  });
});
