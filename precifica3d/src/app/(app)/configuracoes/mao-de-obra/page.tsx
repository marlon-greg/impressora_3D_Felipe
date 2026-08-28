import type { Metadata } from "next";

import { Aviso, Card, CardTitulo, Etiqueta, brl } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { prisma } from "@/server/db/client";
import { exigirEdicao } from "@/server/workspace/contexto";
import { acaoRemoverMaoDeObra } from "../acoes";
import { FormularioMaoDeObra } from "./_formulario";

export const metadata: Metadata = { title: "Mão de obra" };

export default async function PaginaMaoDeObra({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const c = await exigirEdicao();
  const sp = await searchParams;
  const editando = typeof sp.editar === "string" ? sp.editar : null;

  const itens = await prisma.laborRate.findMany({
    where: { workspaceId: c.ws },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  const alvo = editando ? itens.find((i) => i.id === editando) : null;
  const media =
    itens.filter((i) => i.ativo).reduce((s, i) => s + i.valorHora, 0) /
    Math.max(1, itens.filter((i) => i.ativo).length);

  return (
    <Pagina
      titulo="Mão de obra"
      descricao="Quanto vale sua hora em cada etapa. Não é o que você cobraria de um cliente por hora — é o que seu tempo precisa render para valer a pena estar ali em vez de fazendo outra coisa."
      voltar={{ href: "/configuracoes", rotulo: "Ajustes" }}
    >
      {itens.length === 0 && (
        <div className="mb-6">
          <Aviso nivel="atencao" titulo="Seu tempo está saindo de graça">
            Sem valor-hora, toda peça que você lixar, pintar e montar entra no cálculo como se o
            trabalho não custasse nada. É a forma mais comum de vender no prejuízo achando que
            está lucrando.
          </Aviso>
        </div>
      )}

      <div className="space-y-6">
        {itens.length > 0 && (
          <Card>
            <CardTitulo
              descricao={`Média das ativas: ${brl(media)} por hora.`}
            >
              Tipos de trabalho
            </CardTitulo>
            <ul className="divide-y divide-borda">
              {itens.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-texto">
                    {i.nome}
                    {!i.ativo && <Etiqueta tom="neutro">desativado</Etiqueta>}
                  </span>
                  <span className="tabular shrink-0 text-sm font-semibold text-texto">
                    {brl(i.valorHora)}/h
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <a
                      href={`/configuracoes/mao-de-obra?editar=${i.id}`}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-texto-suave hover:bg-superficie-2 hover:text-texto"
                    >
                      editar
                    </a>
                    <form action={acaoRemoverMaoDeObra}>
                      <input type="hidden" name="id" value={i.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-3 py-2 text-xs font-medium text-texto-suave hover:bg-superficie-2 hover:text-texto"
                      >
                        {i.ativo ? "desativar" : "reativar"}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <CardTitulo>{alvo ? `Editar ${alvo.nome}` : "Novo tipo de trabalho"}</CardTitulo>
          <div className="px-5 py-5">
            <FormularioMaoDeObra
              key={alvo?.id ?? "novo"}
              inicial={alvo ? { id: alvo.id, nome: alvo.nome, valorHora: alvo.valorHora } : undefined}
            />
          </div>
        </Card>
      </div>
    </Pagina>
  );
}
