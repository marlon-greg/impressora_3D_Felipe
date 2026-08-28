import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/config/env";
import { coletarTudo } from "@/server/market/runner";
import { processarFila } from "@/server/mail";
import { limparSessoesExpiradas } from "@/server/auth/session";

/**
 * Rotina diária: coleta o mercado, tenta reenviar e-mails que falharam e
 * limpa sessões vencidas.
 *
 * Roda pelo cron da Vercel (ver vercel.json). O plano Hobby permite uma
 * execução por dia — daí a validade dos coletores ser medida em horas e não
 * em minutos.
 *
 * O endpoint é público na internet, então a autenticação é obrigatória: sem
 * ela, qualquer um dispararia coletas em série contra as lojas usando o nosso
 * IP, e o resultado seria bloqueio.
 */

export const dynamic = "force-dynamic";
/** coleta bate em quatro sites; 5 min é folga confortável */
export const maxDuration = 300;

/**
 * Comparação em tempo constante.
 * `a === b` sai mais cedo no primeiro byte diferente, e essa diferença de
 * tempo, medida com paciência, entrega o segredo caractere a caractere.
 */
function segredoConfere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function autorizado(req: NextRequest): boolean {
  const esperado = env().CRON_SECRET;

  // sem segredo configurado o endpoint fica fechado, nunca aberto: um deploy
  // com variável faltando não pode virar porta destrancada
  if (!esperado) return false;

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  // a Vercel manda o segredo neste header; o parâmetro cobre teste manual
  const alternativo = req.nextUrl.searchParams.get("segredo") ?? "";

  return segredoConfere(bearer || alternativo, esperado);
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    // 404 em vez de 401: não confirma nem que a rota existe
    return new NextResponse("Not found", { status: 404 });
  }

  const inicio = Date.now();

  // um passo que falha não pode impedir os outros de rodar
  const [mercado, emails, sessoes] = await Promise.allSettled([
    coletarTudo({ forcar: false }),
    processarFila(20),
    limparSessoesExpiradas(),
  ]);

  const resultado = {
    ok: true,
    duracaoMs: Date.now() - inicio,
    mercado:
      mercado.status === "fulfilled"
        ? {
            ok: mercado.value.ok,
            falhas: mercado.value.falhas,
            coletores: mercado.value.resultados.map((r) => ({
              coletor: r.coletor,
              status: r.status,
              itens: r.itens,
              mensagem: r.mensagem,
            })),
          }
        : { erro: String(mercado.reason) },
    emails: emails.status === "fulfilled" ? emails.value : { erro: String(emails.reason) },
    sessoesLimpas: sessoes.status === "fulfilled" ? sessoes.value : 0,
  };

  console.log("[cron/mercado]", JSON.stringify(resultado));

  return NextResponse.json(resultado);
}

/** A Vercel dispara cron via GET; POST existe para acionar à mão. */
export const POST = GET;
