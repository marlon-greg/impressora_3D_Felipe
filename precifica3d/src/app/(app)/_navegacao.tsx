"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ComponentType } from "react";

import {
  IconePainel,
  IconeProjetos,
  IconeMateriais,
  IconeMercado,
  IconeConfig,
} from "@/components/ui/icones";

/**
 * Navegação principal.
 *
 * No computador vira coluna à esquerda; no celular, barra fixa embaixo — é
 * onde o polegar alcança sem trocar a mão de posição, e ele costuma estar com
 * a outra mão ocupada segurando a peça.
 */

export interface Item {
  href: string;
  rotulo: string;
  icone: ComponentType<{ width?: number; height?: number; className?: string }>;
}

export const ITENS: Item[] = [
  { href: "/painel", rotulo: "Painel", icone: IconePainel },
  { href: "/projetos", rotulo: "Projetos", icone: IconeProjetos },
  { href: "/materiais", rotulo: "Materiais", icone: IconeMateriais },
  { href: "/mercado", rotulo: "Mercado", icone: IconeMercado },
  { href: "/configuracoes", rotulo: "Ajustes", icone: IconeConfig },
];

/** `/projetos/abc` também acende "Projetos". */
function ativo(atual: string, href: string) {
  return atual === href || atual.startsWith(`${href}/`);
}

export function NavegacaoLateral() {
  const atual = usePathname();

  return (
    <nav className="space-y-1" aria-label="Seções">
      {ITENS.map(({ href, rotulo, icone: Icone }) => {
        const aceso = ativo(atual, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={aceso ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              aceso
                ? "bg-marca-700 text-white"
                : "text-texto-suave hover:bg-superficie-2 hover:text-texto",
            )}
          >
            <Icone width={18} height={18} />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavegacaoInferior() {
  const atual = usePathname();

  return (
    <nav
      aria-label="Seções"
      // pb com safe-area: no iPhone a barra de gestos come o rodapé
      className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="flex">
        {ITENS.map(({ href, rotulo, icone: Icone }) => {
          const aceso = ativo(atual, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={aceso ? "page" : undefined}
              className={clsx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                aceso ? "text-marca-700 dark:text-marca-400" : "text-texto-suave",
              )}
            >
              <Icone width={22} height={22} />
              {rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
