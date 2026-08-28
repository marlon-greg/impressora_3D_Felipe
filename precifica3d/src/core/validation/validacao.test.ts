import { describe, it, expect } from "vitest";

import { avaliarSenha, gerarSenhaForte, SENHA_MIN } from "./password";
import { normalizarEmail, emailValido, dominioDe, mascararEmail } from "./email";

/**
 * A política de senha e a normalização de e-mail decidem quem entra na conta.
 * Um furo aqui não dá erro de tela — dá acesso indevido.
 */

describe("política de senha", () => {
  it("recusa senha curta", () => {
    const r = avaliarSenha("Ab1!x");
    expect(r.valida).toBe(false);
    expect(r.erros.join(" ")).toContain(String(SENHA_MIN));
  });

  it("recusa senha de uma classe só, por mais longa que seja", () => {
    expect(avaliarSenha("abcdefghijklmnop").valida).toBe(false);
  });

  it("recusa as senhas que todo invasor testa primeiro", () => {
    for (const s of ["password123", "senha123456", "12345678901"]) {
      expect(avaliarSenha(s).valida, s).toBe(false);
    }
  });

  it("recusa senha que contém o nome da pessoa", () => {
    const r = avaliarSenha("Felipe-2026!x", ["Felipe Souza", "felipe@exemplo.com.br"]);
    expect(r.valida).toBe(false);
    expect(r.erros.join(" ")).toMatch(/nome ou e-mail/i);
  });

  it("enxerga o nome mesmo trocando letra por número", () => {
    // f3l1p3 é a forma que a pessoa acha que é esperta
    const r = avaliarSenha("F3l1p3-Forte-88!", ["Felipe"]);
    expect(r.valida).toBe(false);
  });

  it("recusa espaço nas pontas — costuma ser cópia com sobra", () => {
    expect(avaliarSenha(" Trilho-Bravo-8821!x ").valida).toBe(false);
  });

  it("aceita frase longa e variada", () => {
    const r = avaliarSenha("Sereia-Palito-Vento-73!");
    expect(r.valida).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("dá dica sobre sequência sem necessariamente reprovar", () => {
    const r = avaliarSenha("Qwerty-Marfim-Selva-38!");
    expect(r.dicas.join(" ")).toMatch(/sequências/i);
  });

  it("gerarSenhaForte sempre produz senha aceita pela própria política", () => {
    for (let i = 0; i < 30; i++) {
      const s = gerarSenhaForte(20);
      expect(avaliarSenha(s).valida, s).toBe(true);
    }
  });
});

describe("normalização de e-mail", () => {
  it("ignora maiúsculas", () => {
    expect(normalizarEmail("Felipe@Exemplo.com.BR")).toBe(normalizarEmail("felipe@exemplo.com.br"));
  });

  it("trata pontos e apelidos do Gmail como o mesmo endereço", () => {
    // sem isso, a mesma pessoa cria várias contas sem querer — ou de propósito
    const a = normalizarEmail("fe.li.pe+3d@gmail.com");
    const b = normalizarEmail("felipe@gmail.com");
    expect(a).toBe(b);
  });

  it("não junta endereços de domínios diferentes", () => {
    expect(normalizarEmail("felipe@gmail.com")).not.toBe(normalizarEmail("felipe@outlook.com"));
  });

  it("remove espaços das pontas", () => {
    expect(normalizarEmail("  felipe@exemplo.com.br ")).toBe("felipe@exemplo.com.br");
  });
});

describe("emailValido", () => {
  it("aceita endereços comuns", () => {
    for (const e of ["felipe@exemplo.com.br", "a.b-c_d@sub.dominio.com"]) {
      expect(emailValido(e), e).toBe(true);
    }
  });

  it("recusa o que não é endereço", () => {
    for (const e of ["", "felipe", "felipe@", "@exemplo.com", "felipe @exemplo.com", "a@b"]) {
      expect(emailValido(e), e).toBe(false);
    }
  });
});

describe("apresentação", () => {
  it("dominioDe extrai o domínio", () => {
    expect(dominioDe("Felipe@Exemplo.com.BR")).toBe("exemplo.com.br");
  });

  it("mascararEmail esconde o meio, para poder mostrar sem expor", () => {
    const m = mascararEmail("felipe@exemplo.com.br");
    expect(m).not.toBe("felipe@exemplo.com.br");
    expect(m).toContain("@");
  });
});
