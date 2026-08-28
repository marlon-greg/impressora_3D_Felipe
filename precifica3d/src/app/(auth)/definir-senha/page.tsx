import type { Metadata } from "next";

import { validarToken } from "@/server/auth/service";
import { CartaoAcesso } from "../_componentes";
import { FormNovaSenha } from "../_form-nova-senha";
import { LinkInvalido } from "../_link-invalido";

export const metadata: Metadata = { title: "Criar sua senha" };

/** Primeiro acesso por convite. O link vem do e-mail de boas-vindas. */
export default async function PaginaDefinirSenha({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  const r = token ? await validarToken(token, "CONVITE") : null;

  if (!r?.ok || !r.dados) {
    return (
      <LinkInvalido
        titulo="Convite expirado"
        motivo={r?.mensagem ?? "O endereço veio sem o código do convite."}
        ondeRecomecar="/entrar"
        rotuloRecomecar="Ir para a tela de acesso"
      />
    );
  }

  const primeiroNome = r.dados.nome.split(" ")[0];

  return (
    <CartaoAcesso
      titulo={`Bem-vindo, ${primeiroNome}`}
      descricao={
        <>
          Crie a senha de <strong className="text-texto">{r.dados.email}</strong> para
          ativar seu acesso. Só isso — depois você já cai direto no painel.
        </>
      }
    >
      <FormNovaSenha
        token={token}
        tipo="CONVITE"
        nome={r.dados.nome}
        email={r.dados.email}
        rotuloBotao="Criar senha e entrar"
      />
    </CartaoAcesso>
  );
}
