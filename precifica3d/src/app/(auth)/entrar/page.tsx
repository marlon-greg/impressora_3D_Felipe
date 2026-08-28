import type { Metadata } from "next";

import { Aviso } from "@/components/ui";
import { CartaoAcesso, LinkAcesso } from "../_componentes";
import { FormEntrar } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

/** Avisos que outras telas mandam para cá pela URL. */
const RECADOS: Record<string, { nivel: "info" | "sucesso" | "atencao"; texto: string }> = {
  "email-confirmado": {
    nivel: "sucesso",
    texto: "E-mail confirmado. Agora é só entrar.",
  },
  "senha-definida": {
    nivel: "sucesso",
    texto: "Senha criada. Use-a para entrar.",
  },
  saiu: { nivel: "info", texto: "Você saiu da sua conta." },
  expirada: {
    nivel: "atencao",
    texto: "Sua sessão expirou por inatividade. Entre de novo para continuar.",
  },
};

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const chave = Object.keys(RECADOS).find((k) => sp[k] === "1");
  const recado = chave ? RECADOS[chave] : null;
  // gravado pelo proxy quando alguém sem sessão tentou abrir uma tela interna
  const proximo = typeof sp.proximo === "string" ? sp.proximo : "";

  return (
    <CartaoAcesso
      titulo="Entrar"
      descricao="Acesse o painel do seu ateliê."
      rodape={
        <>
          Ainda não tem conta? <LinkAcesso href="/cadastrar">Criar uma agora</LinkAcesso>
        </>
      }
    >
      {recado && (
        <div className="mb-5">
          <Aviso nivel={recado.nivel}>{recado.texto}</Aviso>
        </div>
      )}
      <FormEntrar proximo={proximo} />
    </CartaoAcesso>
  );
}
