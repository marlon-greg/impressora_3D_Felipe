import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/server/db/client";

/** Ações registradas na trilha de auditoria. Lista fechada para não virar texto livre. */
export const ACOES = {
  LOGIN_OK: "LOGIN_OK",
  LOGIN_FALHA: "LOGIN_FALHA",
  LOGIN_BLOQUEADO: "LOGIN_BLOQUEADO",
  LOGOUT: "LOGOUT",
  CADASTRO: "CADASTRO",
  EMAIL_VERIFICADO: "EMAIL_VERIFICADO",
  EMAIL_REENVIADO: "EMAIL_REENVIADO",
  SENHA_DEFINIDA: "SENHA_DEFINIDA",
  SENHA_ALTERADA: "SENHA_ALTERADA",
  RESET_SOLICITADO: "RESET_SOLICITADO",
  RESET_CONCLUIDO: "RESET_CONCLUIDO",
  TOKEN_INVALIDO: "TOKEN_INVALIDO",
  CONVITE_ENVIADO: "CONVITE_ENVIADO",
  CONVITE_ACEITO: "CONVITE_ACEITO",
  MEMBRO_REMOVIDO: "MEMBRO_REMOVIDO",
  PAPEL_ALTERADO: "PAPEL_ALTERADO",
  SESSOES_ENCERRADAS: "SESSOES_ENCERRADAS",
} as const;

export type Acao = (typeof ACOES)[keyof typeof ACOES];

export async function registrar(
  acao: Acao,
  opcoes: { userId?: string | null; detalhe?: string } = {},
): Promise<void> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;

    await prisma.auditLog.create({
      data: {
        userId: opcoes.userId ?? null,
        acao,
        detalhe: opcoes.detalhe?.slice(0, 500) ?? null,
        ip,
        userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
      },
    });
  } catch (erro) {
    // auditoria nunca pode derrubar a operação principal — registra e segue
    console.error("[auditoria] falha ao registrar", acao, erro);
  }
}

/** IP de quem está chamando, para o rate limit. */
export async function ipAtual(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "desconhecido"
  );
}
