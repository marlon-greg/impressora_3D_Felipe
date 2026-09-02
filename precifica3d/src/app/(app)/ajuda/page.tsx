import type { Metadata } from "next";
import Link from "next/link";

import { Card, Etiqueta, BOTAO } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { IconeAjuda, IconeSeta } from "@/components/ui/icones";
import { SECOES } from "./conteudo";

export const metadata: Metadata = { title: "Manual do usuário" };

/** O caminho mais curto entre abrir o app pela primeira vez e ter um preço confiável. */
const PRIMEIROS_PASSOS = [
  { texto: "Criar sua senha pelo convite", href: "/ajuda/primeiro-acesso" },
  { texto: "Conferir a impressora", href: "/configuracoes/impressoras" },
  { texto: "Lançar a conta de luz", href: "/configuracoes/energia" },
  { texto: "Dizer quanto vale sua hora", href: "/configuracoes/mao-de-obra" },
  { texto: "Escolher margem e taxas", href: "/configuracoes/margem" },
  { texto: "Corrigir os preços dos materiais", href: "/materiais" },
  { texto: "Cadastrar a primeira peça", href: "/projetos/novo" },
];

export default function PaginaAjuda() {
  return (
    <Pagina
      titulo="Manual do usuário"
      descricao="Como o sistema pensa, o que fazer primeiro e o que cada número significa. Escrito para ser lido em pedaços, quando a dúvida aparecer."
    >
      {/* ── o atalho principal ── */}
      <Card className="mb-8 overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-marca-700 text-white"
          >
            <IconeAjuda width={26} height={26} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-texto">
              Nunca usou? Comece pelo simulador
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-texto-suave">
              Dez passos, com a tela de cada um desenhada ao lado da explicação. Você vê o que vai
              acontecer antes de mexer no sistema de verdade — e no passo do preço dá para
              arrastar as gramas e ver o valor mudar.
            </p>
          </div>
          <Link href="/ajuda/simulador" className={`${BOTAO.primario} shrink-0`}>
            Abrir o simulador
            <IconeSeta width={16} height={16} />
          </Link>
        </div>
      </Card>

      {/* ── roteiro dos primeiros 30 minutos ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-texto">Os primeiros 30 minutos</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Nesta ordem. Cada passo torna o próximo mais confiável — e enquanto eles não estiverem
          feitos, todo preço que o sistema mostra carrega a mesma estimativa.
        </p>
        <ol className="mt-4 space-y-2">
          {PRIMEIROS_PASSOS.map((p, i) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className="flex items-center gap-3 rounded-lg border border-borda bg-superficie px-4 py-3 text-sm transition-colors hover:bg-superficie-2"
              >
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-superficie-2 text-xs font-bold text-texto-suave"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 font-medium text-texto">{p.texto}</span>
                <IconeSeta width={16} height={16} className="shrink-0 text-texto-suave" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ── capítulos ── */}
      <section>
        <h2 className="text-sm font-semibold text-texto">Capítulos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SECOES.map((s) => (
            <Link key={s.slug} href={`/ajuda/${s.slug}`} className="group">
              <Card className="h-full p-5 transition-colors group-hover:bg-superficie-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-texto">{s.titulo}</h3>
                  <Etiqueta tom="neutro">{s.minutos} min</Etiqueta>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-texto-suave">{s.resumo}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </Pagina>
  );
}
