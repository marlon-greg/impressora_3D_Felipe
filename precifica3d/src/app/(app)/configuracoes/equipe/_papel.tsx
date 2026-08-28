"use client";

import { useRef } from "react";

import { acaoMudarPapel } from "../acoes";

/**
 * Troca o papel de um membro.
 *
 * Precisa ser componente de cliente por causa do `onChange`: escolher no
 * seletor já envia, sem um botão a mais. Sem JavaScript o botão "aplicar"
 * aparece e o formulário funciona igual — o `hidden` some quando o CSS carrega
 * junto do script.
 */
export function SeletorPapel({ membroId, papel }: { membroId: string; papel: string }) {
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={acaoMudarPapel} className="flex items-center gap-1">
      <input type="hidden" name="membroId" value={membroId} />
      <select
        name="papel"
        defaultValue={papel}
        onChange={() => form.current?.requestSubmit()}
        aria-label="Papel desta pessoa"
        className="rounded-lg border border-borda-forte bg-superficie px-3 py-2 text-sm text-texto focus:border-marca-600 focus:outline-none focus:ring-2 focus:ring-marca-600/20"
      >
        <option value="ADMIN">admin</option>
        <option value="OPERADOR">operador</option>
        <option value="LEITOR">leitor</option>
      </select>
      <noscript>
        <button
          type="submit"
          className="rounded-lg px-2.5 py-2 text-xs font-medium text-texto-suave hover:bg-superficie-2 hover:text-texto"
        >
          aplicar
        </button>
      </noscript>
    </form>
  );
}
