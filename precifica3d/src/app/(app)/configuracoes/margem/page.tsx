import type { Metadata } from "next";

import { Card } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { configuracao, exigirAdmin } from "@/server/workspace/contexto";
import { FormularioMargem } from "./_formulario";

export const metadata: Metadata = { title: "Margem e taxas" };

export default async function PaginaMargem() {
  const c = await exigirAdmin();
  const config = await configuracao(c.ws);

  return (
    <Pagina
      titulo="Margem e taxas"
      descricao="O ponto de partida de toda peça nova. Cada peça pode ter valores próprios; estes são o padrão."
      voltar={{ href: "/configuracoes", rotulo: "Ajustes" }}
    >
      <Card className="px-5 py-1 sm:px-7">
        <FormularioMargem
          inicial={{
            negocioNome: config.negocioNome,
            modoMargem: config.modoMargem as "MARKUP" | "MARGEM_LIQUIDA",
            margemPadraoPct: config.margemPadraoPct,
            taxaCanalPadraoPct: config.taxaCanalPadraoPct,
            taxaPagamentoPct: config.taxaPagamentoPct,
            impostoPct: config.impostoPct,
            custoIndiretoMensal: config.custoIndiretoMensal,
            horasProdutivasMes: config.horasProdutivasMes,
            embalagemPadrao: config.embalagemPadrao,
          }}
        />
      </Card>
    </Pagina>
  );
}
