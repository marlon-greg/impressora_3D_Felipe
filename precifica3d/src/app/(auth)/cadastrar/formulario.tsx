"use client";

import { useActionState, useMemo, useState } from "react";

import { Campo, CampoSenha, BotaoEnviar } from "@/components/forms/campos";
import { Aviso } from "@/components/ui";
import { acaoCadastrar } from "../actions";
import { VAZIO } from "../estado";
import { Feedback, LinkAcesso } from "../_componentes";

export function FormCadastrar() {
  const [estado, enviar] = useActionState(acaoCadastrar, VAZIO);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  // a senha não pode conter o próprio nome nem o e-mail — o medidor precisa
  // saber os dois enquanto a pessoa digita
  const contexto = useMemo(() => [nome, email].filter(Boolean), [nome, email]);

  // deu certo: a resposta é neutra de propósito e o próximo passo é o e-mail,
  // não a tela. Manter o formulário aberto só convidaria a reenviar.
  if (estado.ok) {
    return (
      <div className="space-y-5">
        <Aviso nivel="sucesso" titulo="Confira seu e-mail">
          {estado.mensagem}
        </Aviso>
        <p className="text-sm leading-relaxed text-texto-suave">
          O link vale por 24 horas. Depois de confirmar, você já entra direto no painel.
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
        rotulo="Seu nome"
        name="nome"
        autoComplete="name"
        autoFocus
        obrigatorio
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={estado.campos?.nome}
        placeholder="Felipe Souza"
      />

      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        obrigatorio
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={estado.campos?.email}
        dica="É por aqui que chegam a confirmação e a recuperação de senha."
        placeholder="voce@exemplo.com.br"
      />

      <CampoSenha
        rotulo="Crie uma senha"
        nome="senha"
        autoComplete="new-password"
        medidor
        contexto={contexto}
        obrigatorio
        erro={estado.campos?.senha}
      />

      <CampoSenha
        rotulo="Repita a senha"
        nome="confirmacao"
        autoComplete="new-password"
        obrigatorio
        erro={estado.campos?.confirmacao}
      />

      <BotaoEnviar carregando="Criando conta...">Criar conta</BotaoEnviar>

      <p className="text-xs leading-relaxed text-texto-fraco">
        Conferimos sua senha contra bases de vazamentos públicos sem que ela saia do
        servidor — só um pedaço do código de verificação é consultado.
      </p>
    </form>
  );
}
