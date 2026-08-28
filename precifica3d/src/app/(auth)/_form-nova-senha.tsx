"use client";

import { useActionState, useMemo } from "react";

import { CampoSenha, BotaoEnviar } from "@/components/forms/campos";
import { acaoDefinirSenha } from "./actions";
import { VAZIO } from "./estado";
import { Feedback } from "./_componentes";

/**
 * Serve às duas telas que chegam por link de e-mail: redefinir a senha
 * esquecida e criar a primeira senha de um convite. O que muda entre elas é
 * só o tipo do token — o resto do fluxo é idêntico.
 */
export function FormNovaSenha({
  token,
  tipo,
  nome,
  email,
  rotuloBotao = "Salvar senha",
}: {
  token: string;
  tipo: "RESETAR_SENHA" | "CONVITE";
  nome: string;
  email: string;
  rotuloBotao?: string;
}) {
  const [estado, enviar] = useActionState(acaoDefinirSenha, VAZIO);
  const contexto = useMemo(() => [nome, email].filter(Boolean), [nome, email]);

  return (
    <form action={enviar} className="space-y-5" noValidate>
      <Feedback estado={estado} />

      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="tipo" value={tipo} />

      {/* o gerenciador de senhas do navegador precisa saber de qual conta é */}
      <input type="hidden" name="username" autoComplete="username" value={email} readOnly />

      <CampoSenha
        rotulo="Nova senha"
        nome="senha"
        autoComplete="new-password"
        medidor
        contexto={contexto}
        obrigatorio
        erro={estado.campos?.senha}
      />

      <CampoSenha
        rotulo="Repita a nova senha"
        nome="confirmacao"
        autoComplete="new-password"
        obrigatorio
        erro={estado.campos?.confirmacao}
      />

      <BotaoEnviar carregando="Salvando...">{rotuloBotao}</BotaoEnviar>

      <p className="text-xs leading-relaxed text-texto-fraco">
        Ao salvar, todas as sessões abertas em outros aparelhos são encerradas.
      </p>
    </form>
  );
}
