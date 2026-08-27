import { prisma } from "@/server/db/client";

/**
 * Limite de tentativas com janela deslizante, guardado no banco.
 *
 * Em serverless não existe memória compartilhada entre invocações — um Map
 * em módulo não protege nada, porque cada instância teria o próprio contador.
 * Por isso o estado mora no Postgres.
 *
 * O bloqueio é progressivo: quanto mais o atacante insiste, mais tempo espera.
 */

export interface RegraLimite {
  /** quantas tentativas a janela permite */
  max: number;
  /** tamanho da janela em segundos */
  janelaS: number;
  /** bloqueio inicial ao estourar, em segundos (dobra a cada estouro seguinte) */
  bloqueioS: number;
}

export const REGRAS = {
  login: { max: 5, janelaS: 15 * 60, bloqueioS: 5 * 60 },
  cadastro: { max: 3, janelaS: 60 * 60, bloqueioS: 30 * 60 },
  resetSenha: { max: 3, janelaS: 60 * 60, bloqueioS: 30 * 60 },
  reenviarEmail: { max: 3, janelaS: 60 * 60, bloqueioS: 15 * 60 },
  trocarSenha: { max: 5, janelaS: 15 * 60, bloqueioS: 5 * 60 },
} as const satisfies Record<string, RegraLimite>;

export type Acao = keyof typeof REGRAS;

export interface ResultadoLimite {
  permitido: boolean;
  restantes: number;
  /** segundos até poder tentar de novo */
  esperarS: number;
}

export async function consumir(acao: Acao, identificador: string): Promise<ResultadoLimite> {
  const regra = REGRAS[acao];
  const chave = `${acao}:${identificador}`;
  const agora = new Date();

  const atual = await prisma.rateLimit.findUnique({ where: { chave } });

  if (atual?.bloqueadoAte && atual.bloqueadoAte > agora) {
    return {
      permitido: false,
      restantes: 0,
      esperarS: Math.ceil((atual.bloqueadoAte.getTime() - agora.getTime()) / 1000),
    };
  }

  // janela expirada (ou primeira vez) → começa do zero
  if (!atual || atual.janelaFim <= agora) {
    await prisma.rateLimit.upsert({
      where: { chave },
      create: {
        chave,
        contador: 1,
        janelaFim: new Date(agora.getTime() + regra.janelaS * 1000),
      },
      update: {
        contador: 1,
        janelaFim: new Date(agora.getTime() + regra.janelaS * 1000),
        bloqueadoAte: null,
      },
    });
    return { permitido: true, restantes: regra.max - 1, esperarS: 0 };
  }

  const contador = atual.contador + 1;

  if (contador > regra.max) {
    // cada estouro dobra a punição, com teto de 24 h
    const excedentes = contador - regra.max;
    const segundos = Math.min(regra.bloqueioS * 2 ** (excedentes - 1), 24 * 60 * 60);
    const bloqueadoAte = new Date(agora.getTime() + segundos * 1000);

    await prisma.rateLimit.update({
      where: { chave },
      data: { contador, bloqueadoAte },
    });
    return { permitido: false, restantes: 0, esperarS: segundos };
  }

  await prisma.rateLimit.update({ where: { chave }, data: { contador } });
  return { permitido: true, restantes: regra.max - contador, esperarS: 0 };
}

/** Chamado depois de um login bem-sucedido — quem acertou não deve carregar histórico. */
export async function limpar(acao: Acao, identificador: string): Promise<void> {
  await prisma.rateLimit
    .delete({ where: { chave: `${acao}:${identificador}` } })
    .catch(() => undefined);
}

/** Faxina de janelas vencidas. O cron chama junto com as outras rotinas. */
export async function limparExpirados(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: {
      janelaFim: { lt: new Date() },
      OR: [{ bloqueadoAte: null }, { bloqueadoAte: { lt: new Date() } }],
    },
  });
  return count;
}

/** Frase pronta pra tela, com tempo em minutos quando faz sentido. */
export function mensagemEspera(esperarS: number): string {
  if (esperarS < 60) return `Tente de novo em ${esperarS} segundo${esperarS === 1 ? "" : "s"}.`;
  const min = Math.ceil(esperarS / 60);
  if (min < 60) return `Muitas tentativas. Tente de novo em ${min} minuto${min === 1 ? "" : "s"}.`;
  const h = Math.ceil(min / 60);
  return `Muitas tentativas. Tente de novo em ${h} hora${h === 1 ? "" : "s"}.`;
}
