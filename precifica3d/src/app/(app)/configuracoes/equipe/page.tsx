import type { Metadata } from "next";

import { Aviso, Card, CardTitulo, Etiqueta, tempoRelativo } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { prisma } from "@/server/db/client";
import { exigirAdmin } from "@/server/workspace/contexto";
import { acaoRemoverMembro } from "../acoes";
import { SeletorPapel } from "./_papel";
import { FormularioConvite } from "./_formulario";

export const metadata: Metadata = { title: "Quem tem acesso" };

const PAPEIS: Record<string, { rotulo: string; texto: string }> = {
  DONO: { rotulo: "dono", texto: "criou o ateliê; ninguém pode rebaixar ou remover" },
  ADMIN: { rotulo: "admin", texto: "configura tudo e convida gente" },
  OPERADOR: { rotulo: "operador", texto: "cria peças e mexe no estoque" },
  LEITOR: { rotulo: "leitor", texto: "só visualiza" },
};

export default async function PaginaEquipe() {
  const c = await exigirAdmin();

  const [membros, convitesPendentes] = await Promise.all([
    prisma.membership.findMany({
      where: { workspaceId: c.ws },
      orderBy: { criadoEm: "asc" },
      include: {
        user: {
          select: {
            nome: true,
            email: true,
            emailVerificadoEm: true,
            ultimoAcessoEm: true,
            senhaHash: true,
            ativo: true,
          },
        },
      },
    }),
    prisma.verificationToken.count({
      where: { workspaceId: c.ws, tipo: "CONVITE", usadoEm: null, expiraEm: { gt: new Date() } },
    }),
  ]);

  return (
    <Pagina
      titulo="Quem tem acesso"
      descricao="Todo mundo aqui enxerga os mesmos materiais, peças e preços. Quem se cadastrar por fora ganha um ateliê próprio e não vê nada disto."
      voltar={{ href: "/configuracoes", rotulo: "Ajustes" }}
    >
      <div className="space-y-6">
        <Card>
          <CardTitulo descricao={`${membros.length} pessoa(s) neste ateliê.`}>
            Membros
          </CardTitulo>
          <ul className="divide-y divide-borda">
            {membros.map((m) => {
              const eu = m.userId === c.id;
              const semSenha = !m.user.senhaHash;
              const papel = PAPEIS[m.papel];

              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-texto">
                      {m.user.nome}
                      {eu && <Etiqueta tom="marca">você</Etiqueta>}
                      {semSenha && <Etiqueta tom="atencao">convite pendente</Etiqueta>}
                      {!m.user.ativo && <Etiqueta tom="prejuizo">desativado</Etiqueta>}
                    </p>
                    <p className="mt-0.5 text-xs text-texto-suave">
                      {m.user.email}
                      {m.user.ultimoAcessoEm
                        ? ` · último acesso ${tempoRelativo(m.user.ultimoAcessoEm)}`
                        : " · nunca entrou"}
                    </p>
                    <p className="mt-0.5 text-xs text-texto-fraco">{papel.texto}</p>
                  </div>

                  {m.papel === "DONO" || eu ? (
                    <Etiqueta tom="neutro">{papel.rotulo}</Etiqueta>
                  ) : (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <SeletorPapel membroId={m.id} papel={m.papel} />

                      <form action={acaoRemoverMembro}>
                        <input type="hidden" name="membroId" value={m.id} />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-2 text-xs font-medium text-texto-suave hover:bg-prejuizo-suave hover:text-prejuizo"
                        >
                          remover
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {convitesPendentes > 0 && (
          <Aviso nivel="info">
            {convitesPendentes} convite(s) enviados e ainda não aceitos. O link vale 7 dias; depois
            disso é só convidar de novo.
          </Aviso>
        )}

        <Card>
          <CardTitulo descricao="A pessoa cria a própria senha pelo link do e-mail.">
            Convidar alguém
          </CardTitulo>
          <div className="px-5 py-5">
            <FormularioConvite />
          </div>
        </Card>
      </div>
    </Pagina>
  );
}
