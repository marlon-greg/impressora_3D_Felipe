import type { Metadata } from "next";

import { CartaoAcesso, LinkAcesso } from "../_componentes";
import { FormCadastrar } from "./formulario";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastrar() {
  return (
    <CartaoAcesso
      titulo="Criar conta"
      descricao="Você ganha um ateliê só seu. Ninguém de fora enxerga seus custos, suas peças ou seus preços."
      rodape={
        <>
          Já tem conta? <LinkAcesso href="/entrar">Entrar</LinkAcesso>
        </>
      }
    >
      <FormCadastrar />
    </CartaoAcesso>
  );
}
