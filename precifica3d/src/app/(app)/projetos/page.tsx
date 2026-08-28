import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  Etiqueta,
  Vazio,
  BOTAO,
  brl,
  horas,
  pct,
  tempoRelativo,
} from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { IconeMais } from "@/components/ui/icones";
import { prisma } from "@/server/db/client";
import { exigirContexto, podeEditar } from "@/server/workspace/contexto";
import type { StatusProjeto } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Peças" };

const STATUS: { chave: StatusProjeto; rotulo: string; tom: "neutro" | "marca" | "lucro" }[] = [
  { chave: "RASCUNHO", rotulo: "Rascunho", tom: "neutro" },
  { chave: "PRODUZIDO", rotulo: "Produzida", tom: "marca" },
  { chave: "ANUNCIADO", rotulo: "Anunciada", tom: "marca" },
  { chave: "VENDIDO", rotulo: "Vendida", tom: "lucro" },
];

export default async function PaginaProjetos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const c = await exigirContexto();
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const arquivadas = sp.arquivadas === "1";

  const projetos = await prisma.project.findMany({
    where: {
      workspaceId: c.ws,
      arquivadoEm: arquivadas ? { not: null } : null,
      ...(status ? { status: status as StatusProjeto } : {}),
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" as const } },
              { categoria: { contains: q, mode: "insensitive" as const } },
              { descricao: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { atualizadoEm: "desc" },
    include: {
      snapshots: {
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: { precoIdeal: true, custoTotal: true, margemRealPct: true, riscoScore: true },
      },
      fotos: {
        where: { tipo: "VENDA" },
        orderBy: [{ capa: "desc" }, { ordem: "asc" }],
        take: 1,
        select: { url: true },
      },
      _count: { select: { filamentos: true } },
    },
  });

  const filtrando = Boolean(q || status || arquivadas);

  return (
    <Pagina
      titulo="Peças"
      descricao="Cada peça guarda o cálculo do dia em que foi feita — e recalcula com os preços de hoje quando você abre."
      largura="larga"
      acao={
        podeEditar(c.papel) && (
          <Link href="/projetos/novo" className={BOTAO.primario}>
            <IconeMais width={16} height={16} />
            Nova peça
          </Link>
        )
      }
    >
      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="mb-1.5 block text-xs font-medium text-texto-suave">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="nome ou categoria"
            className="w-full rounded-lg border border-borda-forte bg-superficie px-3 py-2.5 text-sm text-texto placeholder:text-texto-fraco focus:border-marca-600 focus:outline-none focus:ring-2 focus:ring-marca-600/20"
          />
        </div>
        <div>
          <label htmlFor="status" className="mb-1.5 block text-xs font-medium text-texto-suave">
            Situação
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="rounded-lg border border-borda-forte bg-superficie px-3 py-2.5 text-sm text-texto focus:border-marca-600 focus:outline-none focus:ring-2 focus:ring-marca-600/20"
          >
            <option value="">Todas</option>
            {STATUS.map((s) => (
              <option key={s.chave} value={s.chave}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg border border-borda-forte bg-superficie px-4 py-2.5 text-sm font-semibold text-texto hover:bg-superficie-2"
        >
          Filtrar
        </button>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-borda bg-superficie px-3 py-2.5 text-sm text-texto-suave hover:bg-superficie-2 has-checked:border-marca-600 has-checked:text-texto">
          <input
            type="checkbox"
            name="arquivadas"
            value="1"
            defaultChecked={arquivadas}
            className="h-4 w-4 rounded border-borda-forte text-marca-700 focus:ring-marca-600"
          />
          Ver arquivadas
        </label>
      </form>

      {projetos.length === 0 ? (
        <Card>
          <Vazio
            icone={filtrando ? "🔍" : "🧩"}
            titulo={filtrando ? "Nada com esse filtro" : "Nenhuma peça ainda"}
            acao={
              filtrando ? (
                <Link href="/projetos" className={BOTAO.secundario}>
                  Limpar filtros
                </Link>
              ) : (
                podeEditar(c.papel) && (
                  <Link href="/projetos/novo" className={BOTAO.primario}>
                    Calcular a primeira peça
                  </Link>
                )
              )
            }
          >
            {filtrando
              ? "Tente outro termo ou limpe os filtros."
              : "Cadastre uma peça e descubra quanto ela custa de verdade — filamento, energia, desgaste da máquina, tinta, seu tempo e o risco de quebrar."}
          </Vazio>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projetos.map((p) => {
            const snap = p.snapshots[0];
            const preco = p.precoDefinido ?? snap?.precoIdeal ?? null;
            const s = STATUS.find((x) => x.chave === p.status);
            const abaixo =
              p.precoVendaAtual != null && snap && p.precoVendaAtual < snap.custoTotal;

            return (
              <Link key={p.id} href={`/projetos/${p.slug}`}>
                <Card className="h-full overflow-hidden transition-colors hover:border-borda-forte">
                  {p.fotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.fotos[0].url}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-36 w-full items-center justify-center bg-superficie-2 text-4xl opacity-30"
                    >
                      🧩
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-texto">
                        {p.nome}
                      </p>
                      {s && <Etiqueta tom={s.tom}>{s.rotulo}</Etiqueta>}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-texto-suave">
                      {[p.categoria, horas(p.horasImpressao)].filter(Boolean).join(" · ")}
                    </p>

                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        {preco != null ? (
                          <>
                            <p className="tabular text-lg font-bold text-texto">{brl(preco)}</p>
                            <p className="text-xs text-texto-suave">
                              {p.precoDefinido != null ? "preço adotado" : "preço ideal"}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-texto-fraco">sem cálculo salvo</p>
                        )}
                      </div>
                      {snap && (
                        <div className="text-right">
                          <p className="tabular text-sm font-semibold text-texto-suave">
                            {brl(snap.custoTotal)}
                          </p>
                          <p className="text-xs text-texto-fraco">custo</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-borda pt-3">
                      {snap && (
                        <Etiqueta tom={snap.margemRealPct >= 30 ? "lucro" : "atencao"}>
                          {pct(snap.margemRealPct)} de margem
                        </Etiqueta>
                      )}
                      {abaixo && <Etiqueta tom="prejuizo">vende abaixo do custo</Etiqueta>}
                      <span className="ml-auto text-xs text-texto-fraco">
                        {tempoRelativo(p.atualizadoEm)}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Pagina>
  );
}
