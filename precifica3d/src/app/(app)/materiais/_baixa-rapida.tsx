"use client";

import { useActionState, useState } from "react";

import { Aviso } from "@/components/ui";
import { CampoNumero, Campo, BotaoEnviar } from "@/components/forms/campos";
import { SIGLA_UNIDADE, type Unidade } from "@/core/materiais/categorias";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoMovimentar } from "./acoes";

/**
 * Movimentação de estoque.
 *
 * A baixa é o gesto mais repetido do dia, e quase sempre com a peça na outra
 * mão: os atalhos de quantidade existem para resolver no polegar, sem teclado.
 */

type Tipo = "SAIDA" | "ENTRADA" | "AJUSTE";

const ABAS: { tipo: Tipo; rotulo: string; ajuda: string }[] = [
  { tipo: "SAIDA", rotulo: "Dar baixa", ajuda: "Gastou numa peça, ou perdeu." },
  { tipo: "ENTRADA", rotulo: "Repor", ajuda: "Comprou mais e guardou na prateleira." },
  {
    tipo: "AJUSTE",
    rotulo: "Corrigir contagem",
    ajuda: "Você contou e o número real é outro. Informe quanto TEM, não quanto mudou.",
  },
];

export function BaixaRapida({
  materialId,
  unidade,
  estoqueAtual,
  atalhos,
}: {
  materialId: string;
  unidade: Unidade;
  estoqueAtual: number;
  /** quantidades comuns desse material, para resolver num toque */
  atalhos: number[];
}) {
  const [estado, enviar] = useActionState(acaoMovimentar, VAZIO);
  const [tipo, setTipo] = useState<Tipo>("SAIDA");
  const [quantidade, setQuantidade] = useState("");

  const aba = ABAS.find((a) => a.tipo === tipo)!;

  return (
    <div>
      <div role="tablist" aria-label="Tipo de movimentação" className="flex gap-1 p-1">
        {ABAS.map((a) => (
          <button
            key={a.tipo}
            role="tab"
            type="button"
            aria-selected={tipo === a.tipo}
            onClick={() => {
              setTipo(a.tipo);
              setQuantidade("");
            }}
            className={
              tipo === a.tipo
                ? "flex-1 rounded-lg bg-marca-700 px-3 py-2 text-sm font-semibold text-white"
                : "flex-1 rounded-lg px-3 py-2 text-sm font-medium text-texto-suave hover:bg-superficie-2 hover:text-texto"
            }
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <form action={enviar} className="space-y-4 px-5 pb-5 pt-3" noValidate>
        <input type="hidden" name="materialId" value={materialId} />
        <input type="hidden" name="tipo" value={tipo} />

        {estado.mensagem && (
          <Aviso nivel={estado.ok ? "sucesso" : "critico"}>{estado.mensagem}</Aviso>
        )}

        <p className="text-xs leading-relaxed text-texto-suave">{aba.ajuda}</p>

        {tipo !== "AJUSTE" && atalhos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {atalhos.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setQuantidade(String(v))}
                className={
                  quantidade === String(v)
                    ? "tabular rounded-lg border border-marca-600 bg-marca-50 px-3 py-2 text-sm font-semibold text-marca-800 dark:bg-marca-950 dark:text-marca-200"
                    : "tabular rounded-lg border border-borda-forte bg-superficie px-3 py-2 text-sm font-medium text-texto hover:bg-superficie-2"
                }
              >
                {v} {SIGLA_UNIDADE[unidade]}
              </button>
            ))}
          </div>
        )}

        <CampoNumero
          rotulo={tipo === "AJUSTE" ? "Quanto tem de verdade" : "Quantidade"}
          name="quantidade"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          unidade={SIGLA_UNIDADE[unidade]}
          obrigatorio
          erro={estado.campos?.quantidade}
          dica={
            tipo === "AJUSTE"
              ? `O sistema acha que tem ${estoqueAtual} ${SIGLA_UNIDADE[unidade]}.`
              : undefined
          }
        />

        <Campo
          rotulo="Motivo"
          name="motivo"
          placeholder={
            tipo === "SAIDA"
              ? "peça do cliente João"
              : tipo === "ENTRADA"
                ? "compra 3D Fila"
                : "contagem do mês"
          }
          dica="Opcional, mas ajuda quando o extrato não bate."
        />

        <BotaoEnviar carregando="Registrando...">{aba.rotulo}</BotaoEnviar>
      </form>
    </div>
  );
}
