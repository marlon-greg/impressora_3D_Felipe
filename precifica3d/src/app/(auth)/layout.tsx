import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Moldura das telas de acesso: centralizada, estreita e sem navegação.
 * Quem ainda não entrou não tem para onde navegar — qualquer menu aqui só
 * daria caminho para erro.
 */
export default function LayoutAcesso({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2.5 text-lg font-bold tracking-tight text-texto"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-marca-700 text-sm font-black text-white"
          >
            P3
          </span>
          Precifica<span className="-ml-1.5 text-marca-600">3D</span>
        </Link>

        {children}

        <p className="mt-8 text-center text-xs leading-relaxed text-texto-fraco">
          Cada ateliê enxerga só os próprios dados.
          <br />
          Sua senha é guardada com hash — nem nós conseguimos lê-la.
        </p>
      </div>
    </div>
  );
}
