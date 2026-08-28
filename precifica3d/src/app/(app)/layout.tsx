import Link from "next/link";
import type { ReactNode } from "react";

import { IconeSair } from "@/components/ui/icones";
import { exigirContexto } from "@/server/workspace/contexto";
import { acaoSair } from "../(auth)/actions";
import { NavegacaoLateral, NavegacaoInferior } from "./_navegacao";

/**
 * Casca do app logado.
 *
 * A guarda mora aqui, não só no `proxy.ts`: o proxy olha apenas se existe
 * cookie, e cookie forjado passa por ele. `exigirContexto()` consulta a
 * sessão no banco de verdade — e é o que vale.
 */
export default async function LayoutApp({ children }: { children: ReactNode }) {
  const c = await exigirContexto();

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* ── coluna fixa no computador ── */}
      <aside className="hidden w-60 shrink-0 border-r border-borda bg-superficie lg:flex lg:flex-col">
        <div className="border-b border-borda px-5 py-5">
          <Link href="/painel" className="flex items-center gap-2.5 font-bold tracking-tight">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-marca-700 text-xs font-black text-white"
            >
              P3
            </span>
            Precifica<span className="-ml-1.5 text-marca-600">3D</span>
          </Link>
          <p className="mt-3 truncate text-xs text-texto-suave" title={c.workspaceNome}>
            {c.workspaceNome}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavegacaoLateral />
        </div>

        <div className="border-t border-borda p-3">
          <p className="truncate px-3 text-sm font-medium text-texto" title={c.nome}>
            {c.nome}
          </p>
          <p className="truncate px-3 text-xs text-texto-suave" title={c.email}>
            {c.email}
          </p>
          <div className="mt-2 flex gap-1">
            <Link
              href="/trocar-senha"
              className="flex-1 rounded-lg px-3 py-2 text-xs font-medium text-texto-suave hover:bg-superficie-2 hover:text-texto"
            >
              Trocar senha
            </Link>
            <form action={acaoSair}>
              <button
                type="submit"
                title="Sair"
                aria-label="Sair"
                className="rounded-lg px-3 py-2 text-texto-suave hover:bg-superficie-2 hover:text-texto"
              >
                <IconeSair width={16} height={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── barra do celular ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-borda bg-superficie px-4 py-3 lg:hidden">
        <Link href="/painel" className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-md bg-marca-700 text-[10px] font-black text-white"
          >
            P3
          </span>
          Precifica<span className="-ml-1 text-marca-600">3D</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="max-w-32 truncate text-xs text-texto-suave">{c.nome}</span>
          <form action={acaoSair}>
            <button
              type="submit"
              aria-label="Sair"
              className="rounded-lg p-2 text-texto-suave hover:bg-superficie-2"
            >
              <IconeSair width={18} height={18} />
            </button>
          </form>
        </div>
      </header>

      {/* pb-20 no celular: a barra de baixo é fixa e cobriria o fim da página */}
      <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>

      <NavegacaoInferior />
    </div>
  );
}
