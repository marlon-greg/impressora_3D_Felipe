import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { prisma } from "@/server/db/client";
import { validarToken } from "@/server/auth/service";
import { gerarToken, expiraEm, VALIDADE } from "./tokens";

/**
 * Ciclo de vida do token de e-mail, contra o banco de verdade.
 *
 * O que este teste protege: um link de reset que continue valendo depois de
 * usado, ou depois de expirar, é a diferença entre "conta segura" e "qualquer
 * um com acesso à caixa de e-mail antiga entra". As unidades puras não pegam
 * isso — a regra mora na consulta.
 *
 * Precisa do `npm run db:dev` rodando. Sem banco, o arquivo inteiro se pula
 * em vez de falhar, para não quebrar o `npm test` de quem só mexeu na tela.
 */

const EMAIL = "teste-token@precifica3d.local";

let bancoDisponivel = false;
let userId = "";

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    bancoDisponivel = true;
  } catch {
    console.warn("[integração] banco fora — pulando testes de token. Rode `npm run db:dev`.");
    return;
  }

  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const u = await prisma.user.create({
    data: { nome: "Teste Token", email: EMAIL, emailNormalizado: EMAIL },
  });
  userId = u.id;
});

afterAll(async () => {
  if (bancoDisponivel) await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect().catch(() => undefined);
});

/** Cria um token no banco e devolve o valor bruto, que só existiria no e-mail. */
async function criar(opcoes: {
  tipo: "VERIFICAR_EMAIL" | "RESETAR_SENHA" | "CONVITE";
  expiraEmMs?: number;
  jaUsado?: boolean;
}) {
  const { bruto, hash } = gerarToken();
  await prisma.verificationToken.create({
    data: {
      userId,
      tipo: opcoes.tipo,
      tokenHash: hash,
      expiraEm: expiraEm(opcoes.expiraEmMs ?? VALIDADE.RESETAR_SENHA_MS),
      usadoEm: opcoes.jaUsado ? new Date() : null,
    },
  });
  return bruto;
}

describe.runIf(process.env.DATABASE_URL)("ciclo de vida do token", () => {
  it("token recém-criado é aceito e identifica o dono", async (ctx) => {
    if (!bancoDisponivel) return ctx.skip();
    const bruto = await criar({ tipo: "RESETAR_SENHA" });

    const r = await validarToken(bruto, "RESETAR_SENHA");
    expect(r.ok).toBe(true);
    expect(r.dados?.email).toBe(EMAIL);
  });

  it("token expirado é recusado", async (ctx) => {
    if (!bancoDisponivel) return ctx.skip();
    const bruto = await criar({ tipo: "RESETAR_SENHA", expiraEmMs: -1000 });

    const r = await validarToken(bruto, "RESETAR_SENHA");
    expect(r.ok).toBe(false);
  });

  it("token já usado não vale de novo", async (ctx) => {
    if (!bancoDisponivel) return ctx.skip();
    const bruto = await criar({ tipo: "RESETAR_SENHA", jaUsado: true });

    const r = await validarToken(bruto, "RESETAR_SENHA");
    expect(r.ok).toBe(false);
  });

  it("token de convite não abre a tela de redefinir senha", async (ctx) => {
    if (!bancoDisponivel) return ctx.skip();
    const bruto = await criar({ tipo: "CONVITE" });

    // trocar o tipo permitiria usar um convite de 7 dias como reset de 1 h
    expect((await validarToken(bruto, "RESETAR_SENHA")).ok).toBe(false);
    expect((await validarToken(bruto, "CONVITE")).ok).toBe(true);
  });

  it("token inventado é recusado", async (ctx) => {
    if (!bancoDisponivel) return ctx.skip();
    const r = await validarToken(gerarToken().bruto, "RESETAR_SENHA");
    expect(r.ok).toBe(false);
  });

  it("string vazia é recusada sem quebrar", async (ctx) => {
    if (!bancoDisponivel) return ctx.skip();
    const r = await validarToken("", "RESETAR_SENHA");
    expect(r.ok).toBe(false);
  });

  it("o banco guarda só o hash — o valor bruto nunca é gravado", async (ctx) => {
    if (!bancoDisponivel) return ctx.skip();
    const bruto = await criar({ tipo: "VERIFICAR_EMAIL" });

    const achou = await prisma.verificationToken.findFirst({ where: { tokenHash: bruto } });
    expect(achou).toBeNull();
  });

  it("conta desativada não valida token nenhum", async (ctx) => {
    if (!bancoDisponivel) return ctx.skip();
    const bruto = await criar({ tipo: "RESETAR_SENHA" });
    await prisma.user.update({ where: { id: userId }, data: { ativo: false } });

    const r = await validarToken(bruto, "RESETAR_SENHA");
    expect(r.ok).toBe(false);

    await prisma.user.update({ where: { id: userId }, data: { ativo: true } });
  });
});
