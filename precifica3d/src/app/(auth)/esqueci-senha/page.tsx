import type { Metadata } from "next";

import { CartaoAcesso, LinkAcesso } from "../_componentes";
import { FormEsqueciSenha } from "./formulario";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function PaginaEsqueciSenha() {
  return (
    <CartaoAcesso
      titulo="Esqueci minha senha"
      descricao="Informe o e-mail da conta. Enviamos um link para você criar uma senha nova."
      rodape={
        <>
          Lembrou? <LinkAcesso href="/entrar">Voltar para entrar</LinkAcesso>
        </>
      }
    >
      <FormEsqueciSenha />
    </CartaoAcesso>
  );
}
