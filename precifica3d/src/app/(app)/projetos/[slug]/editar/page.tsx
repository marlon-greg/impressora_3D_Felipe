import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Pagina } from "@/components/ui/pagina";
import { exigirEdicao } from "@/server/workspace/contexto";
import { catalogo, rascunhoDe } from "@/server/queries/projetos";
import { FormularioProjeto } from "../../_formulario";

export const metadata: Metadata = { title: "Editar peça" };

export default async function PaginaEditarPeca({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const c = await exigirEdicao();
  const { slug } = await params;

  const [cat, rascunho] = await Promise.all([catalogo(c.ws), rascunhoDe(c.ws, slug)]);
  if (!rascunho) notFound();

  const { id, slug: _slug, status: _status, ...r } = rascunho;

  return (
    <Pagina
      titulo={`Editar ${rascunho.nome}`}
      descricao="Salvar grava um novo cálculo com os preços de hoje. O anterior fica no histórico."
      largura="larga"
      voltar={{ href: `/projetos/${slug}`, rotulo: rascunho.nome }}
    >
      <FormularioProjeto cat={cat} inicial={r} id={id} />
    </Pagina>
  );
}
