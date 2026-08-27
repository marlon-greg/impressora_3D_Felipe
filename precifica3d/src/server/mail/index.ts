import "server-only";
import { env } from "@/config/env";
import { prisma } from "@/server/db/client";
import { enviar, modoSimulado, type Mensagem } from "./transport";
import { montarHtml, montarTexto, type CorpoEmail } from "./templates/layout";

/**
 * Uma função por tipo de e-mail. Nenhuma rota monta HTML nem chama o
 * transporte direto — assim mudar o texto ou o provedor é mexer só aqui.
 */

const url = (caminho: string) => `${env().APP_URL.replace(/\/$/, "")}${caminho}`;

/** Envia e, se falhar, guarda na fila para o cron tentar de novo. */
async function despachar(m: Mensagem, template: string): Promise<{ ok: boolean; erro?: string }> {
  const r = await enviar(m);
  if (r.ok) return { ok: true };

  await prisma.emailQueue
    .create({
      data: {
        para: m.para,
        assunto: m.assunto,
        html: m.html,
        texto: m.texto,
        template,
        status: "PENDENTE",
        ultimoErro: r.erro?.slice(0, 500),
        tentativas: 1,
      },
    })
    .catch((e) => console.error("[email] não consegui nem enfileirar:", e));

  return { ok: false, erro: r.erro };
}

const montar = (para: string, assunto: string, corpo: CorpoEmail): Mensagem => ({
  para,
  assunto,
  html: montarHtml(corpo),
  texto: montarTexto(corpo),
});

// ── Convite / primeiro acesso ──────────────────────────────────

export function emailConvite(nome: string, token: string, convidadoPor?: string) {
  const link = url(`/definir-senha?token=${encodeURIComponent(token)}`);
  return montar(
    "",
    "Confirme seu cadastro e crie sua senha — Precifica3D",
    {
      titulo: "Bem-vindo ao Precifica3D",
      saudacao: `Olá, ${nome}!`,
      paragrafos: [
        convidadoPor
          ? `<strong>${convidadoPor}</strong> criou um acesso para você no Precifica3D — o sistema que calcula quanto suas peças 3D devem custar, considerando filamento, energia, desgaste da impressora, tinta, seu tempo e o risco de quebra.`
          : "Sua conta no Precifica3D foi criada.",
        "Para começar, confirme seu e-mail e defina uma senha:",
      ],
      botao: { texto: "Confirmar e criar senha", url: link },
      urlAlternativa: link,
      aviso: "Este link vale por <strong>7 dias</strong> e só pode ser usado uma vez. Se você não esperava este convite, pode ignorar esta mensagem.",
    },
  );
}

// ── Verificação de e-mail (auto-cadastro) ──────────────────────

export function emailVerificacao(nome: string, token: string) {
  const link = url(`/verificar-email?token=${encodeURIComponent(token)}`);
  return montar("", "Confirme seu e-mail — Precifica3D", {
    titulo: "Confirme seu e-mail",
    saudacao: `Olá, ${nome}!`,
    paragrafos: [
      "Falta só um passo para ativar sua conta no Precifica3D. Clique no botão abaixo para confirmar que este endereço é seu:",
    ],
    botao: { texto: "Confirmar meu e-mail", url: link },
    urlAlternativa: link,
    aviso: "O link vale por <strong>24 horas</strong>. Se não foi você quem se cadastrou, ignore esta mensagem — nenhuma conta será ativada.",
  });
}

// ── Reset de senha ─────────────────────────────────────────────

export function emailResetSenha(nome: string, token: string) {
  const link = url(`/redefinir-senha?token=${encodeURIComponent(token)}`);
  return montar("", "Redefinir sua senha — Precifica3D", {
    titulo: "Redefinir sua senha",
    saudacao: `Olá, ${nome}!`,
    paragrafos: [
      "Recebemos um pedido para redefinir a senha da sua conta. Se foi você, clique no botão abaixo:",
    ],
    botao: { texto: "Criar nova senha", url: link },
    urlAlternativa: link,
    aviso: "Este link expira em <strong>1 hora</strong> e só funciona uma vez.<br><br><strong>Não foi você?</strong> Ignore esta mensagem: sua senha atual continua valendo e ninguém acessou sua conta.",
  });
}

// ── Aviso de senha alterada ────────────────────────────────────

export function emailSenhaAlterada(nome: string, quando: Date) {
  const data = quando.toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  return montar("", "Sua senha foi alterada — Precifica3D", {
    titulo: "Sua senha foi alterada",
    saudacao: `Olá, ${nome}!`,
    paragrafos: [
      `A senha da sua conta no Precifica3D foi alterada em <strong>${data}</strong>.`,
      "Por segurança, todos os outros dispositivos conectados foram desconectados.",
    ],
    botao: { texto: "Acessar o Precifica3D", url: url("/entrar") },
    aviso: "<strong>Não foi você?</strong> Use a opção “Esqueci minha senha” imediatamente para retomar o controle da conta.",
  });
}

// ── Funções de envio ───────────────────────────────────────────

export const enviarConvite = (para: string, nome: string, token: string, por?: string) =>
  despachar({ ...emailConvite(nome, token, por), para }, "convite");

export const enviarVerificacao = (para: string, nome: string, token: string) =>
  despachar({ ...emailVerificacao(nome, token), para }, "verificacao");

export const enviarResetSenha = (para: string, nome: string, token: string) =>
  despachar({ ...emailResetSenha(nome, token), para }, "reset-senha");

export const enviarAvisoSenhaAlterada = (para: string, nome: string) =>
  despachar({ ...emailSenhaAlterada(nome, new Date()), para }, "senha-alterada");

// ── Fila: reprocessamento pelo cron ────────────────────────────

const MAX_TENTATIVAS = 5;

export async function processarFila(limite = 20): Promise<{ enviados: number; falhas: number }> {
  const pendentes = await prisma.emailQueue.findMany({
    where: { status: "PENDENTE", tentativas: { lt: MAX_TENTATIVAS } },
    orderBy: { criadoEm: "asc" },
    take: limite,
  });

  let enviados = 0;
  let falhas = 0;

  for (const item of pendentes) {
    const r = await enviar({
      para: item.para,
      assunto: item.assunto,
      html: item.html,
      texto: item.texto ?? "",
    });

    if (r.ok) {
      enviados++;
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: { status: "ENVIADO", enviadoEm: new Date(), tentativas: { increment: 1 } },
      });
    } else {
      falhas++;
      const tentativas = item.tentativas + 1;
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: {
          tentativas,
          ultimoErro: r.erro?.slice(0, 500),
          status: tentativas >= MAX_TENTATIVAS ? "FALHOU" : "PENDENTE",
        },
      });
    }
  }

  return { enviados, falhas };
}

export { modoSimulado };
