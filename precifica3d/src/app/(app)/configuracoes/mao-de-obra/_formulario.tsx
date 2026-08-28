"use client";

import { useActionState } from "react";

import { Campo, CampoNumero, BotaoEnviar } from "@/components/forms/campos";
import { Aviso } from "@/components/ui";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoSalvarMaoDeObra } from "../acoes";

export function FormularioMaoDeObra({
  inicial,
}: {
  inicial?: { id: string; nome: string; valorHora: number };
}) {
  const [estado, enviar] = useActionState(acaoSalvarMaoDeObra, VAZIO);

  return (
    <form action={enviar} className="space-y-4" noValidate>
      {inicial && <input type="hidden" name="id" value={inicial.id} />}

      {estado.mensagem && (
        <Aviso nivel={estado.ok ? "sucesso" : "critico"}>{estado.mensagem}</Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Campo
          rotulo="Tipo de trabalho"
          name="nome"
          defaultValue={inicial?.nome ?? ""}
          obrigatorio
          placeholder="Pintura"
          erro={estado.campos?.nome}
        />
        <CampoNumero
          rotulo="Valor da hora"
          name="valorHora"
          defaultValue={inicial?.valorHora ?? ""}
          unidade="R$"
          obrigatorio
          erro={estado.campos?.valorHora}
        />
      </div>

      <div className="max-w-xs">
        <BotaoEnviar carregando="Salvando...">
          {inicial ? "Salvar" : "Adicionar tipo de trabalho"}
        </BotaoEnviar>
      </div>
    </form>
  );
}
