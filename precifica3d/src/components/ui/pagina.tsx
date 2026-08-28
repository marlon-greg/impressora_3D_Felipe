import Link from "next/link";
import type { ReactNode } from "react";

import { IconeVoltar } from "./icones";

/**
 * Moldura de uma tela interna: largura máxima, respiro e cabeçalho.
 * Centralizar isso evita que cada página invente sua própria margem e o app
 * fique parecendo cinco aplicativos diferentes.
 */
export function Pagina({
  titulo,
  descricao,
  acao,
  voltar,
  children,
  largura = "normal",
}: {
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  voltar?: { href: string; rotulo: string };
  children: ReactNode;
  largura?: "normal" | "larga";
}) {
  return (
    <div
      className={
        largura === "larga"
          ? "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8"
          : "mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
      }
    >
      {voltar && (
        <Link
          href={voltar.href}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-texto-suave hover:text-texto"
        >
          <IconeVoltar width={16} height={16} />
          {voltar.rotulo}
        </Link>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-texto">{titulo}</h1>
          {descricao && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-texto-suave">
              {descricao}
            </p>
          )}
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </div>

      {children}
    </div>
  );
}

/** Faixa de seção dentro de uma página longa (formulários por etapas). */
export function Secao({
  titulo,
  descricao,
  children,
  numero,
}: {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  numero?: number;
}) {
  return (
    <section className="border-b border-borda py-6 last:border-b-0">
      <div className="mb-4 flex items-start gap-3">
        {numero != null && (
          <span
            aria-hidden
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-700 text-xs font-bold text-white"
          >
            {numero}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-texto">{titulo}</h2>
          {descricao && (
            <p className="mt-1 text-sm leading-relaxed text-texto-suave">{descricao}</p>
          )}
        </div>
      </div>
      <div className={numero != null ? "sm:pl-9" : undefined}>{children}</div>
    </section>
  );
}

/** Grade responsiva de cartões de métrica. */
export function Grade({
  colunas = 4,
  children,
}: {
  colunas?: 2 | 3 | 4;
  children: ReactNode;
}) {
  const classe = {
    2: "grid gap-4 sm:grid-cols-2",
    3: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
  }[colunas];
  return <div className={classe}>{children}</div>;
}
