import type { Metadata } from "next";

import { Card } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { exigirEdicao } from "@/server/workspace/contexto";
import { FormularioMaterial, MATERIAL_VAZIO } from "../_formulario";

export const metadata: Metadata = { title: "Novo material" };

export default async function PaginaNovoMaterial() {
  await exigirEdicao();

  return (
    <Pagina
      titulo="Novo material"
      descricao="O preço que você lançar aqui é o que vai aparecer no custo de toda peça que usar este item."
      voltar={{ href: "/materiais", rotulo: "Materiais" }}
    >
      <Card className="px-5 py-1 sm:px-7">
        <FormularioMaterial inicial={MATERIAL_VAZIO} />
      </Card>
    </Pagina>
  );
}
