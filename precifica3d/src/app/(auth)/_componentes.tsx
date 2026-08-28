import Link from "next/link";
import type { ReactNode } from "react";

import { Aviso } from "@/components/ui";
import type { EstadoForm } from "./estado";

/**
 * Peças visuais das telas de acesso.
 *
 * Nada aqui tem estado, então o arquivo fica sem "use client" e serve tanto
 * às páginas (Server Components) quanto aos formulários (Client Components).
 */

export function CartaoAcesso({
  titulo,
  descricao,
  children,
  rodape,
}: {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-borda bg-superficie p-6 shadow-sm sm:p-8">
      <h1 className="text-xl font-bold tracking-tight text-texto">{titulo}</h1>
      {descricao && (
        <p className="mt-1.5 text-sm leading-relaxed text-texto-suave">{descricao}</p>
      )}
      <div className="mt-6">{children}</div>
      {rodape && (
        <div className="mt-6 border-t border-borda pt-5 text-center text-sm text-texto-suave">
          {rodape}
        </div>
      )}
    </div>
  );
}

/** Retorno do servidor: verde quando deu certo, vermelho quando não. */
export function Feedback({ estado }: { estado: EstadoForm }) {
  if (!estado.mensagem) return null;
  return (
    <div className="mb-5">
      <Aviso nivel={estado.ok ? "sucesso" : "critico"}>
        {estado.mensagem}
        {estado.linkDev && (
          <>
            {" "}
            <a href={estado.linkDev} className="font-semibold underline">
              abrir o link agora
            </a>
          </>
        )}
      </Aviso>
    </div>
  );
}

export function LinkAcesso({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-semibold text-marca-700 underline-offset-2 hover:underline dark:text-marca-400"
    >
      {children}
    </Link>
  );
}
