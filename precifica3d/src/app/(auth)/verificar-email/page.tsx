import type { Metadata } from "next";

import { validarToken } from "@/server/auth/service";
import { CartaoAcesso, LinkAcesso } from "../_componentes";
import { LinkInvalido } from "../_link-invalido";
import { BotaoConfirmar } from "./formulario";

export const metadata: Metadata = { title: "Confirmar e-mail" };

export default async function PaginaVerificarEmail({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  const r = token ? await validarToken(token, "VERIFICAR_EMAIL") : null;

  if (!r?.ok || !r.dados) {
    return (
      <LinkInvalido
        titulo="Link de confirmação inválido"
        motivo={r?.mensagem ?? "O endereço veio sem o código de confirmação."}
        ondeRecomecar="/entrar"
        rotuloRecomecar="Pedir um link novo na tela de acesso"
      />
    );
  }

  return (
    <CartaoAcesso
      titulo="Confirmar e-mail"
      descricao={
        <>
          Confirme que <strong className="text-texto">{r.dados.email}</strong> é seu para
          ativar a conta.
        </>
      }
      rodape={
        <>
          Não é você? <LinkAcesso href="/entrar">Ignore e volte para o acesso</LinkAcesso>
        </>
      }
    >
      <BotaoConfirmar token={token} />
    </CartaoAcesso>
  );
}
