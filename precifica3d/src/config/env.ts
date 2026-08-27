import { z } from "zod";

/**
 * Validação de ambiente na partida.
 * Melhor o deploy falhar aqui, com mensagem clara, do que a aplicação subir
 * e só quebrar quando o Felipe clicar em "recuperar senha" às 23h.
 */

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),

  /** chave de 32+ bytes para assinar/derivar tokens. Gere com: openssl rand -base64 48 */
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET precisa de pelo menos 32 caracteres"),

  /** URL pública do app — usada nos links de e-mail. Sem ela o link de verificação sai quebrado. */
  APP_URL: z.string().url().default("http://localhost:3000"),

  // ── E-mail: escolha um provedor. Todos têm plano gratuito. ──
  MAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
  MAIL_FROM: z.string().default("Precifica3D <nao-responda@localhost>"),

  RESEND_API_KEY: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  // ── Storage de imagens (Supabase) ──
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default("fotos"),

  // ── Mercado ──
  /** protege o endpoint de cron contra chamada de terceiros */
  CRON_SECRET: z.string().optional(),
  /** opcional: habilita a coleta de preços praticados no Mercado Livre */
  ML_CLIENT_ID: z.string().optional(),
  ML_CLIENT_SECRET: z.string().optional(),

  /** desliga a exigência de e-mail verificado (só para desenvolvimento local) */
  EXIGIR_EMAIL_VERIFICADO: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
});

export type Env = z.infer<typeof schema>;

function carregar(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const problemas = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variáveis de ambiente inválidas:\n${problemas}\n\n` +
        `Copie .env.example para .env e preencha. Veja docs/CONFIGURACAO.md.`,
    );
  }

  const env = parsed.data;

  // Coerências que o schema sozinho não pega
  if (env.MAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
    throw new Error("MAIL_PROVIDER=resend exige RESEND_API_KEY.");
  }
  if (env.MAIL_PROVIDER === "smtp" && !(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)) {
    throw new Error("MAIL_PROVIDER=smtp exige SMTP_HOST, SMTP_USER e SMTP_PASS.");
  }
  if (env.NODE_ENV === "production") {
    if (env.MAIL_PROVIDER === "console") {
      throw new Error(
        "Em produção o MAIL_PROVIDER não pode ser 'console' — ninguém receberia o e-mail de verificação.",
      );
    }
    if (env.APP_URL.startsWith("http://")) {
      throw new Error("Em produção a APP_URL precisa ser https — o cookie de sessão exige.");
    }
  }

  return env;
}

let cache: Env | null = null;

export function env(): Env {
  if (!cache) cache = carregar();
  return cache;
}

export const ehProducao = () => env().NODE_ENV === "production";
