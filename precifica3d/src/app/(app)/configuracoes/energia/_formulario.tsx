"use client";

import { useActionState, useMemo, useState } from "react";

import { Campo, CampoNumero, Selecao, BotaoEnviar } from "@/components/forms/campos";
import { Aviso, brl } from "@/components/ui";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoSalvarTarifa } from "../acoes";

/**
 * A conta de luz vira R$/kWh.
 *
 * Dividir o valor total pelo consumo dá um número bem maior que a tarifa que a
 * distribuidora anuncia — porque a conta inclui impostos, bandeira, iluminação
 * pública e taxa mínima. É esse número maior que é o custo real de imprimir.
 */
export function FormularioTarifa() {
  const [estado, enviar] = useActionState(acaoSalvarTarifa, VAZIO);
  const [valor, setValor] = useState("");
  const [consumo, setConsumo] = useState("");

  const kwh = useMemo(() => {
    const v = Number(valor.replace(",", "."));
    const c = Number(consumo.replace(",", "."));
    return Number.isFinite(v) && Number.isFinite(c) && c > 0 ? v / c : 0;
  }, [valor, consumo]);

  const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <form action={enviar} className="space-y-5" noValidate>
      {estado.mensagem && (
        <Aviso nivel={estado.ok ? "sucesso" : "critico"}>{estado.mensagem}</Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="De que mês é a conta"
          name="referencia"
          defaultValue={mesAtual}
          obrigatorio
          erro={estado.campos?.referencia}
        />
        <Campo rotulo="Distribuidora" name="distribuidora" placeholder="CPFL, Enel, Cemig" />

        <CampoNumero
          rotulo="Valor total da conta"
          name="valorConta"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          unidade="R$"
          obrigatorio
          dica="O valor que você pagou, com tudo incluído."
          erro={estado.campos?.valorConta}
        />
        <CampoNumero
          rotulo="Consumo do mês"
          name="consumoKwh"
          value={consumo}
          onChange={(e) => setConsumo(e.target.value)}
          unidade="kWh"
          obrigatorio
          dica="Vem impresso na conta, geralmente perto do gráfico de barras."
          erro={estado.campos?.consumoKwh}
        />

        <Selecao rotulo="Bandeira tarifária" name="bandeira" defaultValue="VERDE">
          <option value="VERDE">Verde</option>
          <option value="AMARELA">Amarela</option>
          <option value="VERMELHA_1">Vermelha patamar 1</option>
          <option value="VERMELHA_2">Vermelha patamar 2</option>
        </Selecao>
      </div>

      {kwh > 0 && (
        <div className="rounded-lg border border-marca-200 bg-marca-50 p-4 dark:border-marca-800 dark:bg-marca-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-marca-700 dark:text-marca-300">
            Seu quilowatt-hora real
          </p>
          <p className="tabular mt-2 text-2xl font-bold text-texto">
            {brl(kwh)}
            <span className="text-base font-normal text-texto-suave">/kWh</span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-texto-suave">
            É maior que a tarifa anunciada pela distribuidora porque já embute impostos,
            bandeira e iluminação pública. Uma impressora de 180 W ligada 10 h gasta{" "}
            <strong className="text-texto">{brl(0.18 * 10 * kwh)}</strong>.
          </p>
        </div>
      )}

      <div className="max-w-xs">
        <BotaoEnviar carregando="Salvando...">Lançar conta</BotaoEnviar>
      </div>
    </form>
  );
}
