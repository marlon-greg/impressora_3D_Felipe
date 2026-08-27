import "server-only";
import { env } from "@/config/env";

/**
 * Transporte de e-mail com adaptador plugável.
 *
 * Todo envio passa por aqui — nenhuma rota chama API de e-mail direto.
 * Trocar de provedor é mudar MAIL_PROVIDER no .env, sem tocar em código.
 *
 *   console  desenvolvimento: imprime o link no terminal, não envia nada
 *   smtp     Brevo (300/dia grátis) ou Gmail (senha de app) — entrega pra qualquer endereço
 *   resend   3.000/mês grátis, mas exige domínio verificado para enviar a terceiros
 */

export interface Mensagem {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}

export interface ResultadoEnvio {
  ok: boolean;
  id?: string;
  erro?: string;
  /** true quando nada foi enviado de fato (modo console) */
  simulado?: boolean;
}

interface Adaptador {
  nome: string;
  enviar(m: Mensagem): Promise<ResultadoEnvio>;
}

// ── console ────────────────────────────────────────────────────

const adaptadorConsole: Adaptador = {
  nome: "console",
  async enviar(m) {
    // extrai o link para você poder clicar direto do terminal
    const link = m.html.match(/href="([^"]+)"/)?.[1];
    console.log(
      [
        "",
        "┌─────────────────────────────────────────────────────────────",
        `│ 📧  E-MAIL SIMULADO (MAIL_PROVIDER=console)`,
        `│ Para:    ${m.para}`,
        `│ Assunto: ${m.assunto}`,
        link ? `│` : "",
        link ? `│ 🔗 LINK: ${link}` : "",
        "└─────────────────────────────────────────────────────────────",
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return { ok: true, simulado: true, id: "console" };
  },
};

// ── SMTP (Brevo, Gmail, qualquer servidor) ─────────────────────

const adaptadorSmtp: Adaptador = {
  nome: "smtp",
  async enviar(m) {
    const e = env();
    // import dinâmico: nodemailer só entra no bundle de quem usa SMTP
    const { createTransport } = await import("nodemailer");

    const transporte = createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT ?? 587,
      // 465 exige TLS na conexão; 587 sobe pra TLS via STARTTLS
      secure: e.SMTP_SECURE ?? e.SMTP_PORT === 465,
      auth: { user: e.SMTP_USER, pass: e.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    const info = await transporte.sendMail({
      from: e.MAIL_FROM,
      to: m.para,
      subject: m.assunto,
      text: m.texto,
      html: m.html,
    });
    return { ok: true, id: info.messageId };
  },
};

// ── Resend ─────────────────────────────────────────────────────

const adaptadorResend: Adaptador = {
  nome: "resend",
  async enviar(m) {
    const e = env();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${e.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: e.MAIL_FROM,
        to: [m.para],
        subject: m.assunto,
        html: m.html,
        text: m.texto,
      }),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      throw new Error(`Resend respondeu ${res.status}: ${corpo.slice(0, 300)}`);
    }
    const dados = (await res.json()) as { id?: string };
    return { ok: true, id: dados.id };
  },
};

function adaptador(): Adaptador {
  switch (env().MAIL_PROVIDER) {
    case "smtp":
      return adaptadorSmtp;
    case "resend":
      return adaptadorResend;
    default:
      return adaptadorConsole;
  }
}

/**
 * Envia agora. Erro vira `{ ok: false }` com a mensagem — quem chama decide
 * se cai na fila para retentar ou avisa o usuário.
 */
export async function enviar(m: Mensagem): Promise<ResultadoEnvio> {
  const a = adaptador();
  try {
    return await a.enviar(m);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error(`[email:${a.nome}] falha ao enviar para ${m.para}:`, mensagem);
    return { ok: false, erro: mensagem };
  }
}

export const provedorAtual = () => env().MAIL_PROVIDER;
export const modoSimulado = () => env().MAIL_PROVIDER === "console";
