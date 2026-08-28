"use client";

import { useActionState } from "react";

import { Campo, Selecao, BotaoEnviar } from "@/components/forms/campos";
import { Aviso } from "@/components/ui";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoConvidar } from "../acoes";

export function FormularioConvite() {
  const [estado, enviar] = useActionState(acaoConvidar, VAZIO);

  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.mensagem && (
        <Aviso nivel={estado.ok ? "sucesso" : "critico"}>
          {estado.mensagem}
          {estado.linkDev && (
            <>
              {" "}
              <a href={estado.linkDev} className="font-semibold underline">
                abrir o link do convite
              </a>{" "}
              <span className="text-xs">(aparece só em desenvolvimento)</span>
            </>
          )}
        </Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          rotulo="Nome"
          name="nome"
          obrigatorio
          placeholder="Felipe"
          erro={estado.campos?.nome}
        />
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          obrigatorio
          placeholder="felipe@exemplo.com.br"
          erro={estado.campos?.email}
        />
        <Selecao rotulo="O que pode fazer" name="papel" defaultValue="OPERADOR">
          <option value="OPERADOR">Operador — usa no dia a dia</option>
          <option value="ADMIN">Admin — também configura tudo</option>
          <option value="LEITOR">Leitor — só visualiza</option>
        </Selecao>
      </div>

      <p className="text-xs leading-relaxed text-texto-suave">
        A pessoa recebe um e-mail com um link para criar a própria senha. Você nunca vê nem
        define a senha dela.
      </p>

      <div className="max-w-xs">
        <BotaoEnviar carregando="Enviando...">Enviar convite</BotaoEnviar>
      </div>
    </form>
  );
}
