import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Aviso } from "@/components/ui";
import { sessaoAtual } from "@/server/auth/session";
import { CartaoAcesso, LinkAcesso } from "../_componentes";
import { FormTrocarSenha } from "./formulario";

export const metadata: Metadata = { title: "Trocar senha" };

export default async function PaginaTrocarSenha({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar?expirada=1");

  const sp = await searchParams;
  // obrigatória quando a conta nasceu com senha provisória — o servidor marca
  // `precisaTrocarSenha` e o login manda para cá antes de qualquer outra tela
  const obrigatorio = sp.obrigatorio === "1" || sessao.precisaTrocarSenha;

  return (
    <CartaoAcesso
      titulo={obrigatorio ? "Defina sua senha" : "Trocar senha"}
      descricao={
        <>
          Conta de <strong className="text-texto">{sessao.email}</strong>.
        </>
      }
      rodape={
        obrigatorio ? undefined : (
          <LinkAcesso href="/painel">Voltar ao painel sem trocar</LinkAcesso>
        )
      }
    >
      {obrigatorio && (
        <div className="mb-5">
          <Aviso nivel="atencao" titulo="Troca obrigatória">
            Sua senha atual foi criada por quem montou o acesso — outra pessoa a conhece.
            Escolha uma só sua para continuar.
          </Aviso>
        </div>
      )}

      <FormTrocarSenha
        nome={sessao.nome}
        email={sessao.email}
        obrigatorio={obrigatorio}
      />
    </CartaoAcesso>
  );
}
