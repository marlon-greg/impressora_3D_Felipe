import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BOTAO } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { IconeSeta, IconeVoltar } from "@/components/ui/icones";
import { SECOES, acharSecao } from "../conteudo";

export function generateStaticParams() {
  return SECOES.map((s) => ({ secao: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ secao: string }>;
}): Promise<Metadata> {
  const { secao } = await params;
  const s = acharSecao(secao);
  return { title: s ? `${s.titulo} · Manual` : "Manual" };
}

export default async function PaginaSecaoAjuda({
  params,
}: {
  params: Promise<{ secao: string }>;
}) {
  const { secao } = await params;
  const s = acharSecao(secao);
  if (!s) notFound();

  const i = SECOES.indexOf(s);
  const anterior = SECOES[i - 1];
  const proxima = SECOES[i + 1];

  return (
    <Pagina
      titulo={s.titulo}
      descricao={s.resumo}
      voltar={{ href: "/ajuda", rotulo: "Manual do usuário" }}
    >
      <article className="max-w-2xl space-y-4">
        <s.Corpo />
      </article>

      <nav className="mt-10 flex flex-wrap gap-3 border-t border-borda pt-6">
        {anterior && (
          <Link href={`/ajuda/${anterior.slug}`} className={BOTAO.secundario}>
            <IconeVoltar width={16} height={16} />
            {anterior.titulo}
          </Link>
        )}
        {proxima && (
          <Link href={`/ajuda/${proxima.slug}`} className={`${BOTAO.secundario} ml-auto`}>
            {proxima.titulo}
            <IconeSeta width={16} height={16} />
          </Link>
        )}
      </nav>
    </Pagina>
  );
}
