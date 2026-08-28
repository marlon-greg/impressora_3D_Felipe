import type { Metadata } from "next";

import { validarToken } from "@/server/auth/service";
import { CartaoAcesso } from "../_componentes";
import { FormNovaSenha } from "../_form-nova-senha";
import { LinkInvalido } from "../_link-invalido";

export const metadata: Metadata = { title: "Criar nova senha" };

export default async function PaginaRedefinirSenha({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  // conferimos o link ANTES de desenhar o formulário: pedir uma senha forte
  // para só depois dizer "link expirado" seria cruel
  const r = token ? await validarToken(token, "RESETAR_SENHA") : null;

  if (!r?.ok || !r.dados) {
    return (
      <LinkInvalido
        titulo="Este link não vale mais"
        motivo={r?.mensagem ?? "O endereço veio sem o código de recuperação."}
      />
    );
  }

  return (
    <CartaoAcesso
      titulo="Criar nova senha"
      descricao={
        <>
          Conta de <strong className="text-texto">{r.dados.email}</strong>.
        </>
      }
    >
      <FormNovaSenha
        token={token}
        tipo="RESETAR_SENHA"
        nome={r.dados.nome}
        email={r.dados.email}
        rotuloBotao="Salvar nova senha"
      />
    </CartaoAcesso>
  );
}
