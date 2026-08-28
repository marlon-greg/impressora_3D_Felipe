import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { prisma } from "@/server/db/client";
import { exigirEdicao } from "@/server/workspace/contexto";
import { FormularioMaterial } from "../../_formulario";
import type { Categoria, Unidade } from "@/core/materiais/categorias";

export const metadata: Metadata = { title: "Editar material" };

/** null/0 viram string vazia: campo numérico com "0" atrapalha quem vai digitar. */
const txt = (v: string | null | undefined) => v ?? "";
const numTxt = (v: number | null | undefined) => (v == null ? "" : String(v));

export default async function PaginaEditarMaterial({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const c = await exigirEdicao();
  const { id } = await params;

  const m = await prisma.material.findFirst({ where: { id, workspaceId: c.ws } });
  if (!m) notFound();

  return (
    <Pagina
      titulo={`Editar ${m.nome}`}
      descricao="Mudar o preço aqui não recalcula sozinho as peças já salvas — cada peça guarda o cálculo do dia em que foi feita."
      voltar={{ href: `/materiais/${m.id}`, rotulo: m.nome }}
    >
      <Card className="px-5 py-1 sm:px-7">
        <FormularioMaterial
          inicial={{
            id: m.id,
            nome: m.nome,
            categoria: m.categoria as Categoria,
            marca: txt(m.marca),
            tipoMaterial: txt(m.tipoMaterial),
            cor: txt(m.cor),
            corHex: txt(m.corHex),
            unidade: m.unidade as Unidade,
            tamanhoEmbalagem: String(m.tamanhoEmbalagem),
            precoEmbalagem: String(m.precoEmbalagem),
            rendimentoPecas: numTxt(m.rendimentoPecas),
            diametroMm: numTxt(m.diametroMm),
            densidadeGcm3: numTxt(m.densidadeGcm3),
            tempBico: numTxt(m.tempBico),
            tempMesa: numTxt(m.tempMesa),
            estoqueMinimo: String(m.estoqueMinimo),
            fornecedor: txt(m.fornecedor),
            notas: txt(m.notas),
            precoEstimado: m.precoEstimado,
          }}
        />
      </Card>
    </Pagina>
  );
}
