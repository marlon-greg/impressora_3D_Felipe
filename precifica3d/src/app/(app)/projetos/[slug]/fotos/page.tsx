import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Aviso, Card, CardTitulo, Etiqueta, Vazio } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { prisma } from "@/server/db/client";
import { exigirEdicao } from "@/server/workspace/contexto";
import { storageConfigurado, MOTIVO_NAO_CONFIGURADO } from "@/server/storage";
import { Enviador } from "./_enviador";
import { acaoApagarFoto, acaoDefinirCapa } from "./acoes";

export const metadata: Metadata = { title: "Fotos da peça" };

const GALERIAS = [
  {
    tipo: "VENDA" as const,
    titulo: "Fotos de venda",
    descricao: "A peça pronta, bonita, no ângulo que vende. É daqui que sai a capa do anúncio.",
  },
  {
    tipo: "FABRICACAO" as const,
    titulo: "Fotos de fabricação",
    descricao:
      "O processo, o setup, e principalmente as que deram errado — é o que te faz lembrar por que aquela peça precisou ser refeita.",
  },
];

export default async function PaginaFotos({ params }: { params: Promise<{ slug: string }> }) {
  const c = await exigirEdicao();
  const { slug } = await params;

  const projeto = await prisma.project.findFirst({
    where: { workspaceId: c.ws, slug },
    include: { fotos: { orderBy: [{ capa: "desc" }, { ordem: "asc" }] } },
  });
  if (!projeto) notFound();

  const configurado = storageConfigurado();

  return (
    <Pagina
      titulo={`Fotos — ${projeto.nome}`}
      descricao="Duas galerias separadas: o que você mostra ao cliente e o que você guarda para si."
      largura="larga"
      voltar={{ href: `/projetos/${slug}`, rotulo: projeto.nome }}
    >
      {!configurado && (
        <div className="mb-6">
          <Aviso nivel="atencao" titulo="Armazenamento não configurado">
            {MOTIVO_NAO_CONFIGURADO} Enquanto isso, o resto do sistema funciona normalmente — as
            fotos são o único recurso que depende dele.
          </Aviso>
        </div>
      )}

      <div className="space-y-8">
        {GALERIAS.map((g) => {
          const fotos = projeto.fotos.filter((f) => f.tipo === g.tipo);
          return (
            <Card key={g.tipo}>
              <CardTitulo descricao={g.descricao}>
                {g.titulo}
                {fotos.length > 0 && (
                  <span className="ml-2 font-normal text-texto-suave">({fotos.length})</span>
                )}
              </CardTitulo>

              <div className="p-5">
                {configurado && <Enviador slug={slug} tipo={g.tipo} />}

                {fotos.length === 0 ? (
                  !configurado && (
                    <Vazio icone="📷" titulo="Nenhuma foto">
                      Configure o Supabase para começar a guardar fotos aqui.
                    </Vazio>
                  )
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {fotos.map((f) => (
                      <figure key={f.id} className="group">
                        <div className="relative overflow-hidden rounded-lg border border-borda">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={f.url}
                            alt={f.legenda ?? `Foto de ${projeto.nome}`}
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                          {f.capa && (
                            <span className="absolute left-2 top-2">
                              <Etiqueta tom="marca">capa</Etiqueta>
                            </span>
                          )}
                        </div>

                        <figcaption className="mt-2 flex items-center justify-between gap-2">
                          {!f.capa && g.tipo === "VENDA" ? (
                            <form action={acaoDefinirCapa}>
                              <input type="hidden" name="id" value={f.id} />
                              <input type="hidden" name="slug" value={slug} />
                              <button
                                type="submit"
                                className="text-xs font-medium text-texto-suave hover:text-marca-700 dark:hover:text-marca-400"
                              >
                                usar como capa
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs text-texto-fraco">
                              {f.bytes ? `${Math.round(f.bytes / 1024)} KB` : ""}
                            </span>
                          )}

                          <form action={acaoApagarFoto}>
                            <input type="hidden" name="id" value={f.id} />
                            <input type="hidden" name="slug" value={slug} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-texto-suave hover:text-prejuizo"
                            >
                              apagar
                            </button>
                          </form>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Pagina>
  );
}
