"use client";

import { useActionState } from "react";

import { BotaoEnviar } from "@/components/forms/campos";
import { acaoVerificarEmail } from "../actions";
import { VAZIO } from "../estado";
import { Feedback } from "../_componentes";

export function BotaoConfirmar({ token }: { token: string }) {
  const [estado, enviar] = useActionState(acaoVerificarEmail, VAZIO);

  return (
    <form action={enviar} className="space-y-5">
      <Feedback estado={estado} />
      <input type="hidden" name="token" value={token} />
      <BotaoEnviar carregando="Confirmando...">Confirmar meu e-mail</BotaoEnviar>
      <p className="text-xs leading-relaxed text-texto-fraco">
        A confirmação acontece só quando você clica, nunca ao abrir a página — antivírus
        de e-mail costuma abrir os links da mensagem sozinho e queimaria o código.
      </p>
    </form>
  );
}
