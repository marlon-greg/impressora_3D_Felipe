import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { prisma } from "@/server/db/client";
import { ehProducao } from "@/config/env";
import { gerarToken, hashToken, VALIDADE } from "./tokens";
import type { Papel } from "@/generated/prisma/enums";

export const COOKIE_SESSAO = "p3d_sessao";

/**
 * Sessão em cookie httpOnly + registro no banco.
 *
 * httpOnly     → script na página não lê o cookie (barra roubo por XSS)
 * secure       → só trafega em HTTPS
 * sameSite=lax → o navegador não manda o cookie em POST de outro site (barra CSRF)
 * path=/       → vale no app inteiro
 */
const opcoesCookie = (expiraEm: Date) => ({
  httpOnly: true,
  secure: ehProducao(),
  sameSite: "lax" as const,
  path: "/",
  expires: expiraEm,
});

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  emailVerificado: boolean;
  precisaTrocarSenha: boolean;
  superAdmin: boolean;
  workspaceId: string;
  workspaceNome: string;
  papel: Papel;
}

async function contextoRequisicao() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 255) ?? null };
}

export async function criarSessao(userId: string, lembrar = false): Promise<void> {
  const { bruto, hash } = gerarToken();
  const expiraEm = new Date(
    Date.now() + (lembrar ? VALIDADE.SESSAO_LONGA_MS : VALIDADE.SESSAO_MS),
  );
  const { ip, userAgent } = await contextoRequisicao();

  await prisma.session.create({
    data: { userId, tokenHash: hash, expiraEm, ip, userAgent },
  });

  const jar = await cookies();
  jar.set(COOKIE_SESSAO, bruto, opcoesCookie(expiraEm));
}

/**
 * Lê a sessão do cookie. Memoizada por requisição com `cache()` do React:
 * várias camadas podem chamar `sessaoAtual()` sem multiplicar consultas.
 */
export const sessaoAtual = cache(async (): Promise<UsuarioSessao | null> => {
  const jar = await cookies();
  const bruto = jar.get(COOKIE_SESSAO)?.value;
  if (!bruto) return null;

  const sessao = await prisma.session.findUnique({
    where: { tokenHash: hashToken(bruto) },
    include: {
      user: {
        include: {
          membros: { include: { workspace: true }, orderBy: { criadoEm: "asc" }, take: 1 },
        },
      },
    },
  });

  if (!sessao || sessao.revogadaEm) return null;
  if (sessao.expiraEm <= new Date()) {
    await prisma.session.delete({ where: { id: sessao.id } }).catch(() => undefined);
    return null;
  }
  if (!sessao.user.ativo) return null;

  const vinculo = sessao.user.membros[0];
  if (!vinculo) return null;

  // renovação deslizante: só grava se passou 1 h, pra não escrever a cada request
  if (Date.now() - sessao.ultimoUsoEm.getTime() > 60 * 60 * 1000) {
    await prisma.session
      .update({ where: { id: sessao.id }, data: { ultimoUsoEm: new Date() } })
      .catch(() => undefined);
  }

  return {
    id: sessao.user.id,
    nome: sessao.user.nome,
    email: sessao.user.email,
    emailVerificado: sessao.user.emailVerificadoEm != null,
    precisaTrocarSenha: sessao.user.precisaTrocarSenha,
    superAdmin: sessao.user.superAdmin,
    workspaceId: vinculo.workspaceId,
    workspaceNome: vinculo.workspace.nome,
    papel: vinculo.papel,
  };
});

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  const bruto = jar.get(COOKIE_SESSAO)?.value;
  if (bruto) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(bruto) } })
      .catch(() => undefined);
  }
  jar.delete(COOKIE_SESSAO);
}

/** Derruba todas as sessões do usuário — usado ao trocar senha. */
export async function encerrarTodasSessoes(userId: string, exceto?: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId, ...(exceto ? { NOT: { tokenHash: exceto } } : {}) },
  });
}

export async function limparSessoesExpiradas(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiraEm: { lt: new Date() } },
  });
  return count;
}

// ── Guardas ────────────────────────────────────────────────────

export class NaoAutenticado extends Error {
  constructor() {
    super("Sessão inválida ou expirada.");
    this.name = "NaoAutenticado";
  }
}

export class SemPermissao extends Error {
  constructor(mensagem = "Você não tem permissão para isso.") {
    super(mensagem);
    this.name = "SemPermissao";
  }
}

/** Use em rota/action que exige login. Lança se não houver sessão. */
export async function exigirSessao(): Promise<UsuarioSessao> {
  const s = await sessaoAtual();
  if (!s) throw new NaoAutenticado();
  return s;
}

const HIERARQUIA: Record<Papel, number> = {
  LEITOR: 0,
  OPERADOR: 1,
  ADMIN: 2,
  DONO: 3,
};

export async function exigirPapel(minimo: Papel): Promise<UsuarioSessao> {
  const s = await exigirSessao();
  if (HIERARQUIA[s.papel] < HIERARQUIA[minimo]) {
    throw new SemPermissao(`Esta ação exige o papel ${minimo.toLowerCase()} ou superior.`);
  }
  return s;
}

export const podeEditar = (papel: Papel) => HIERARQUIA[papel] >= HIERARQUIA.OPERADOR;
export const podeAdministrar = (papel: Papel) => HIERARQUIA[papel] >= HIERARQUIA.ADMIN;
