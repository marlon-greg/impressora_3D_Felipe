"use client";

import { useActionState } from "react";

import { Campo, BotaoEnviar } from "@/components/forms/campos";
import { Aviso } from "@/components/ui";
import { acaoSolicitarReset } from "../actions";
import { VAZIO } from "../estado";
import { Feedback, LinkAcesso } from "../_componentes";

export function FormEsqueciSenha() {
  const [estado, enviar] = useActionState(acaoSolicitarReset, VAZIO);

  if (estado.ok) {
    return (
      <div className="space-y-5">
        <Aviso nivel="sucesso" titulo="Pedido registrado">
          {estado.mensagem}
        </Aviso>
        <p className="text-sm leading-relaxed text-texto-suave">
          O link expira em 1 hora e só funciona uma vez. Enquanto você não usá-lo, sua
          senha atual continua valendo.
        </p>
        <p className="text-center text-sm">
          <LinkAcesso href="/entrar">Voltar para a tela de entrada</LinkAcesso>
        </p>
      </div>
    );
  }

  return (
    <form action={enviar} className="space-y-5" noValidate>
      <Feedback estado={estado} />

      <Campo
        rotulo="E-mail da conta"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        obrigatorio
        erro={estado.campos?.email}
        placeholder="voce@exemplo.com.br"
      />

      <BotaoEnviar carregando="Enviando...">Enviar link de recuperação</BotaoEnviar>

      <p className="text-xs leading-relaxed text-texto-fraco">
        A resposta é a mesma para e-mail cadastrado ou não. Assim ninguém descobre quem
        tem conta aqui só testando endereços.
      </p>
    </form>
  );
}
