import type { Metadata } from "next";
import Link from "next/link";

import { Aviso } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { exigirEdicao } from "@/server/workspace/contexto";
import { catalogo } from "@/server/queries/projetos";
import { rascunhoVazio } from "@/core/pricing/montar";
import { FormularioProjeto } from "../_formulario";

export const metadata: Metadata = { title: "Nova peça" };

export default async function PaginaNovaPeca() {
  const c = await exigirEdicao();
  const cat = await catalogo(c.ws);

  return (
    <Pagina
      titulo="Nova peça"
      descricao="Preencha o que souber. O preço vai aparecendo ao lado e muda a cada ajuste — dá para brincar com os números antes de salvar."
      largura="larga"
      voltar={{ href: "/projetos", rotulo: "Peças" }}
    >
      {cat.tarifaKwh === 0 && (
        <div className="mb-6">
          <Aviso nivel="atencao" titulo="Sem tarifa de energia">
            O custo de energia vai sair zerado.{" "}
            <Link href="/configuracoes/energia" className="font-semibold underline">
              Lance uma conta de luz
            </Link>{" "}
            para o R$/kWh vir do valor que você paga de verdade.
          </Aviso>
        </div>
      )}

      <FormularioProjeto cat={cat} inicial={rascunhoVazio(cat)} />
    </Pagina>
  );
}
