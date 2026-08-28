"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { CampoNumero } from "@/components/forms/campos";

/**
 * Campo numérico que guarda o texto digitado e devolve número.
 *
 * Sem isto, digitar "0,75" quebra: ao teclar a vírgula o valor ainda não é
 * número, o pai converteria para 0 e apagaria o que a pessoa estava
 * escrevendo. O texto fica aqui dentro; o pai só recebe número válido.
 */
export function CampoNum({
  rotulo,
  valor,
  aoMudar,
  unidade,
  dica,
  placeholder,
  obrigatorio,
}: {
  rotulo: string;
  valor: number | null;
  aoMudar: (n: number) => void;
  unidade?: string;
  dica?: ReactNode;
  placeholder?: string;
  obrigatorio?: boolean;
}) {
  const [texto, setTexto] = useState(valor == null || valor === 0 ? "" : String(valor));

  return (
    <CampoNumero
      rotulo={rotulo}
      value={texto}
      unidade={unidade}
      dica={dica}
      placeholder={placeholder}
      obrigatorio={obrigatorio}
      onChange={(e) => {
        const t = e.target.value;
        setTexto(t);
        const n = Number(t.replace(",", "."));
        aoMudar(t.trim() === "" ? 0 : Number.isFinite(n) ? n : 0);
      }}
    />
  );
}

/** Caixa de marcar compacta, para as listas de complexidade e acabamento. */
export function Chave({
  rotulo,
  descricao,
  marcado,
  aoMudar,
}: {
  rotulo: string;
  descricao?: string;
  marcado: boolean;
  aoMudar: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-borda bg-superficie p-3 transition-colors hover:bg-superficie-2 has-checked:border-marca-600 has-checked:bg-marca-50 dark:has-checked:bg-marca-950/40">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-borda-forte text-marca-700 focus:ring-marca-600"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-texto">{rotulo}</span>
        {descricao && (
          <span className="mt-0.5 block text-xs leading-relaxed text-texto-suave">
            {descricao}
          </span>
        )}
      </span>
    </label>
  );
}

/** Linha de uma lista que cresce (filamento, material, trabalho). */
export function Linha({
  children,
  aoRemover,
}: {
  children: ReactNode;
  aoRemover: () => void;
}) {
  return (
    <div className="rounded-lg border border-borda bg-superficie-2/50 p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={aoRemover}
          aria-label="Remover esta linha"
          className="mt-7 shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium text-texto-suave hover:bg-prejuizo-suave hover:text-prejuizo"
        >
          remover
        </button>
      </div>
    </div>
  );
}
