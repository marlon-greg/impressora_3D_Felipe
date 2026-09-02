import type { Metadata } from "next";

import { Pagina } from "@/components/ui/pagina";
import { Simulador } from "./_simulador";

export const metadata: Metadata = { title: "Simulador · Manual" };

export default function PaginaSimulador() {
  return (
    <Pagina
      titulo="Simulador passo a passo"
      descricao="Dez passos do primeiro login até a primeira peça anunciada. Nada aqui é gravado: as telas ao lado são desenhos, e o cálculo do passo 9 é o motor de preço de verdade rodando com números de exemplo."
      voltar={{ href: "/ajuda", rotulo: "Manual do usuário" }}
      largura="larga"
    >
      <Simulador />
    </Pagina>
  );
}
