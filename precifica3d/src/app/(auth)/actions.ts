"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import * as auth from "@/server/auth/service";
import { encerrarSessao, sessaoAtual } from "@/server/auth/session";
import { registrar, ACOES } from "@/server/auth/audit";
import { avaliarSenha } from "@/core/validation/password";
import type { EstadoForm } from "./estado";

/**
 * Server Actions da autenticação.
 *
 * Toda entrada é validada aqui com Zod, no servidor. A validação do
 * navegador existe só para dar resposta rápida — ela pode ser burlada
 * abrindo o DevTools, então nunca é a que decide.
 */

const texto = (max = 200) => z.string().trim().max(max);

const paraEstado = (r: auth.Resultado<unknown>): EstadoForm => ({
  ok: r.ok,
  mensagem: r.mensagem,
  campos: r.campos,
});

function erroZod(e: z.ZodError): EstadoForm {
  const campos: Record<string, string> = {};
  for (const i of e.issues) {
    const campo = String(i.path[0] ?? "geral");
    if (!campos[campo]) campos[campo] = i.message;
  }
  return { ok: false, mensagem: "Confira os campos destacados.", campos };
}

// ── Cadastro ───────────────────────────────────────────────────

const esquemaCadastro = z.object({
  nome: texto(120).min(2, "Informe seu nome completo."),
  email: texto(254).min(6, "Informe seu e-mail."),
  senha: z.string().min(1, "Crie uma senha."),
  confirmacao: z.string().min(1, "Repita a senha."),
});

export async function acaoCadastrar(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const p = esquemaCadastro.safeParse(Object.fromEntries(dados));
  if (!p.success) return erroZod(p.error);

  if (p.data.senha !== p.data.confirmacao) {
    return { ok: false, mensagem: "As senhas não conferem.", campos: { confirmacao: "As senhas não conferem." } };
  }

  const r = await auth.cadastrar(p.data);
  return { ...paraEstado(r), linkDev: undefined };
}

// ── Login ──────────────────────────────────────────────────────

const esquemaLogin = z.object({
  email: texto(254).min(1, "Informe seu e-mail."),
  senha: z.string().min(1, "Informe sua senha."),
  lembrar: z.union([z.literal("on"), z.literal("")]).optional(),
});

/**
 * Para onde mandar depois do login. O destino vem da URL, então é entrada de
 * quem clicou no link: só aceitamos caminho interno. "//evil.com" e
 * "https://evil.com" são endereços de outro site — deixá-los passar seria um
 * redirecionamento aberto, usado para phishing com o domínio certo na barra.
 */
function destinoSeguro(bruto: unknown): string | null {
  const v = typeof bruto === "string" ? bruto.trim() : "";
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  return v;
}

export async function acaoEntrar(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const p = esquemaLogin.safeParse(Object.fromEntries(dados));
  if (!p.success) return erroZod(p.error);

  const r = await auth.entrar({
    email: p.data.email,
    senha: p.data.senha,
    lembrar: p.data.lembrar === "on",
  });

  if (!r.ok) return paraEstado(r);

  // troca obrigatória vem antes de qualquer destino guardado
  if (r.dados?.precisaTrocarSenha) redirect("/trocar-senha?obrigatorio=1");

  // redirect() lança por dentro — precisa ficar FORA de qualquer try/catch
  redirect(destinoSeguro(dados.get("proximo")) ?? "/painel");
}

export async function acaoSair(): Promise<void> {
  const s = await sessaoAtual();
  if (s) await registrar(ACOES.LOGOUT, { userId: s.id });
  await encerrarSessao();
  redirect("/entrar");
}

// ── Verificar e-mail ───────────────────────────────────────────

/**
 * Fica atrás de um botão de propósito. Antivírus de e-mail corporativo abre
 * todos os links da mensagem para escanear — se a verificação acontecesse no
 * GET, o token seria queimado antes de a pessoa clicar.
 */
export async function acaoVerificarEmail(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const token = String(dados.get("token") ?? "").trim();
  if (!token) return { ok: false, mensagem: "Link inválido ou incompleto." };

  const r = await auth.verificarEmail(token);
  if (!r.ok) return paraEstado(r);

  // verificarEmail já abre a sessão — a pessoa entra direto
  redirect("/painel?email-confirmado=1");
}

// ── Reenviar verificação ───────────────────────────────────────

export async function acaoReenviarVerificacao(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim();
  if (!email) return { ok: false, mensagem: "Informe o e-mail." };
  return paraEstado(await auth.reenviarVerificacao(email));
}

// ── Esqueci a senha ────────────────────────────────────────────

export async function acaoSolicitarReset(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim();
  if (!email) return { ok: false, mensagem: "Informe o e-mail.", campos: { email: "Obrigatório." } };
  return paraEstado(await auth.solicitarReset(email));
}

// ── Definir senha por link (reset ou primeiro acesso) ──────────

const esquemaDefinir = z.object({
  token: z.string().min(20, "Link inválido."),
  senha: z.string().min(1, "Crie uma senha."),
  confirmacao: z.string().min(1, "Repita a senha."),
  tipo: z.enum(["RESETAR_SENHA", "CONVITE", "VERIFICAR_EMAIL"]),
});

export async function acaoDefinirSenha(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const p = esquemaDefinir.safeParse(Object.fromEntries(dados));
  if (!p.success) return erroZod(p.error);

  if (p.data.senha !== p.data.confirmacao) {
    return {
      ok: false,
      mensagem: "As senhas não conferem.",
      campos: { confirmacao: "As senhas não conferem." },
    };
  }

  const r = await auth.definirSenhaPorToken({
    token: p.data.token,
    senha: p.data.senha,
    tipo: p.data.tipo,
  });

  if (!r.ok) return paraEstado(r);
  redirect("/painel?boas-vindas=1");
}

// ── Trocar senha (logado) ──────────────────────────────────────

const esquemaTrocar = z.object({
  senhaAtual: z.string().min(1, "Informe a senha atual."),
  senhaNova: z.string().min(1, "Crie a nova senha."),
  confirmacao: z.string().min(1, "Repita a nova senha."),
});

export async function acaoTrocarSenha(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const s = await sessaoAtual();
  if (!s) redirect("/entrar");

  const p = esquemaTrocar.safeParse(Object.fromEntries(dados));
  if (!p.success) return erroZod(p.error);

  if (p.data.senhaNova !== p.data.confirmacao) {
    return {
      ok: false,
      mensagem: "As senhas não conferem.",
      campos: { confirmacao: "As senhas não conferem." },
    };
  }

  const r = await auth.trocarSenha({
    userId: s.id,
    senhaAtual: p.data.senhaAtual,
    senhaNova: p.data.senhaNova,
  });

  if (!r.ok) return paraEstado(r);
  redirect("/painel?senha-alterada=1");
}

// ── Medidor de força (chamado enquanto digita) ─────────────────

export async function acaoAvaliarSenha(senha: string, contexto: string[] = []) {
  return avaliarSenha(senha, contexto);
}
