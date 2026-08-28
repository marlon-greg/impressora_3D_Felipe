"use client";

import { useActionState } from "react";

import { Campo, CampoSenha, Marcador, BotaoEnviar } from "@/components/forms/campos";
import { acaoEntrar, acaoReenviarVerificacao } from "../actions";
import { VAZIO } from "../estado";
import { Feedback, LinkAcesso } from "../_componentes";

export function FormEntrar({ proximo }: { proximo: string }) {
  const [estado, enviar] = useActionState(acaoEntrar, VAZIO);

  return (
    <>
      <form action={enviar} className="space-y-5" noValidate>
        <Feedback estado={estado} />

        {proximo && <input type="hidden" name="proximo" value={proximo} />}

        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoFocus
          obrigatorio
          erro={estado.campos?.email}
          placeholder="voce@exemplo.com.br"
        />

        <CampoSenha
          rotulo="Senha"
          nome="senha"
          autoComplete="current-password"
          obrigatorio
          erro={estado.campos?.senha}
        />

        <Marcador
          rotulo="Continuar conectado neste aparelho"
          descricao="Marque só no seu celular ou computador pessoal. Em máquina compartilhada, deixe desmarcado."
          name="lembrar"
        />

        <BotaoEnviar carregando="Entrando...">Entrar</BotaoEnviar>
      </form>

      <p className="mt-4 text-center text-sm">
        <LinkAcesso href="/esqueci-senha">Esqueci minha senha</LinkAcesso>
      </p>

      <ReenviarVerificacao />
    </>
  );
}

/**
 * Fica recolhido: é o caminho de exceção, e quem precisa dele já sabe que
 * precisa. Usamos <details> em vez de um botão com estado porque ele abre sem
 * JavaScript — o resto da página também funciona assim, e seria estranho que
 * justo o socorro de quem não recebeu o e-mail dependesse do script carregar.
 */
function ReenviarVerificacao() {
  const [estado, enviar] = useActionState(acaoReenviarVerificacao, VAZIO);

  return (
    <details className="group mt-6 border-t border-borda pt-5">
      <summary className="cursor-pointer list-none text-center text-sm text-texto-suave marker:content-none">
        Não recebeu o e-mail de confirmação?{" "}
        <span className="font-semibold text-marca-700 underline-offset-2 group-open:hidden hover:underline dark:text-marca-400">
          Reenviar
        </span>
      </summary>

      <form action={enviar} className="mt-5 space-y-4" noValidate>
        <Feedback estado={estado} />
        <Campo
          rotulo="Reenviar confirmação para"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@exemplo.com.br"
          dica="Se este endereço tiver uma conta pendente, o link novo chega em instantes. O link anterior deixa de valer."
        />
        <BotaoEnviar carregando="Enviando...">Reenviar link</BotaoEnviar>
      </form>
    </details>
  );
}
