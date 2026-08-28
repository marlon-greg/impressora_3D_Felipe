"use client";

import { useActionState, useMemo } from "react";

import { CampoSenha, BotaoEnviar } from "@/components/forms/campos";
import { acaoTrocarSenha } from "../actions";
import { VAZIO } from "../estado";
import { Feedback } from "../_componentes";

export function FormTrocarSenha({
  nome,
  email,
  obrigatorio,
}: {
  nome: string;
  email: string;
  obrigatorio: boolean;
}) {
  const [estado, enviar] = useActionState(acaoTrocarSenha, VAZIO);
  const contexto = useMemo(() => [nome, email].filter(Boolean), [nome, email]);

  return (
    <form action={enviar} className="space-y-5" noValidate>
      <Feedback estado={estado} />

      <input type="hidden" name="username" autoComplete="username" value={email} readOnly />

      <CampoSenha
        rotulo={obrigatorio ? "Senha provisória (a que você recebeu)" : "Senha atual"}
        nome="senhaAtual"
        autoComplete="current-password"
        obrigatorio
        erro={estado.campos?.senhaAtual}
      />

      <CampoSenha
        rotulo="Nova senha"
        nome="senhaNova"
        autoComplete="new-password"
        medidor
        contexto={contexto}
        obrigatorio
        erro={estado.campos?.senhaNova}
      />

      <CampoSenha
        rotulo="Repita a nova senha"
        nome="confirmacao"
        autoComplete="new-password"
        obrigatorio
        erro={estado.campos?.confirmacao}
      />

      <BotaoEnviar carregando="Salvando...">Salvar nova senha</BotaoEnviar>

      <p className="text-xs leading-relaxed text-texto-fraco">
        As outras sessões abertas são encerradas e você recebe um e-mail avisando da
        troca — se não foi você, dá para reagir na hora.
      </p>
    </form>
  );
}
