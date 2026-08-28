"use client";

import { useActionState } from "react";

import { Aviso } from "@/components/ui";
import { BotaoEnviar } from "@/components/forms/campos";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoColetarAgora } from "./acoes";

export function BotaoColetar({ coletor }: { coletor?: string }) {
  const [estado, enviar] = useActionState(acaoColetarAgora, VAZIO);

  return (
    <form action={enviar} className="space-y-3">
      {coletor && <input type="hidden" name="coletor" value={coletor} />}
      {estado.mensagem && (
        <Aviso nivel={estado.ok ? "sucesso" : "atencao"}>{estado.mensagem}</Aviso>
      )}
      <BotaoEnviar carregando="Buscando..." variante={coletor ? "secundario" : "primario"}>
        {coletor ? "Tentar este de novo" : "Coletar agora"}
      </BotaoEnviar>
    </form>
  );
}
