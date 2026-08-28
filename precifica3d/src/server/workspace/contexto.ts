import "server-only";
import { redirect } from "next/navigation";

import { sessaoAtual, type UsuarioSessao } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

/**
 * Contexto de quem está usando o app: sessão + workspace.
 *
 * Toda consulta de tela passa por aqui para pegar o `workspaceId`. É essa
 * disciplina — e não o `proxy.ts` — que garante o isolamento entre ateliês:
 * quem esquecer o filtro de workspace numa query vaza dado de outro cliente.
 */

export interface Contexto extends UsuarioSessao {
  /** atalho: o mesmo `workspaceId` da sessão, com nome mais direto */
  ws: string;
}

/**
 * Exige login para ver a página. Redireciona em vez de lançar, porque em
 * página o que a pessoa precisa é chegar na tela de entrada — não ver um erro.
 */
export async function exigirContexto(): Promise<Contexto> {
  const s = await sessaoAtual();
  if (!s) redirect("/entrar?expirada=1");
  if (s.precisaTrocarSenha) redirect("/trocar-senha?obrigatorio=1");
  return { ...s, ws: s.workspaceId };
}

const HIERARQUIA = { LEITOR: 0, OPERADOR: 1, ADMIN: 2, DONO: 3 } as const;

/** Só quem pode escrever. LEITOR cai no painel com um recado. */
export async function exigirEdicao(): Promise<Contexto> {
  const c = await exigirContexto();
  if (HIERARQUIA[c.papel] < HIERARQUIA.OPERADOR) redirect("/painel?sem-permissao=1");
  return c;
}

export async function exigirAdmin(): Promise<Contexto> {
  const c = await exigirContexto();
  if (HIERARQUIA[c.papel] < HIERARQUIA.ADMIN) redirect("/painel?sem-permissao=1");
  return c;
}

export const podeEditar = (papel: keyof typeof HIERARQUIA) =>
  HIERARQUIA[papel] >= HIERARQUIA.OPERADOR;
export const podeAdministrar = (papel: keyof typeof HIERARQUIA) =>
  HIERARQUIA[papel] >= HIERARQUIA.ADMIN;

/**
 * Configuração do ateliê, criando a linha padrão se ainda não existir.
 * Um workspace nasce com `configuracao: { create: {} }`, mas dado antigo ou
 * importado pode não ter — melhor garantir aqui do que espalhar `?? padrão`.
 */
export async function configuracao(ws: string) {
  const existente = await prisma.settings.findUnique({ where: { workspaceId: ws } });
  if (existente) return existente;
  return prisma.settings.create({ data: { workspaceId: ws } });
}

/** Tarifa de energia ativa, em R$/kWh já com impostos e bandeira. */
export async function tarifaKwh(ws: string): Promise<{ valor: number; estimado: boolean } | null> {
  const t = await prisma.energyTariff.findFirst({
    where: { workspaceId: ws, ativa: true },
    orderBy: { criadoEm: "desc" },
  });
  if (!t || t.consumoKwh <= 0) return null;
  return { valor: t.valorConta / t.consumoKwh, estimado: t.estimado };
}
