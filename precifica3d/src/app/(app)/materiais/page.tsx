import type { Metadata } from "next";
import Link from "next/link";

import {
  Aviso,
  Card,
  Etiqueta,
  SeloEstimado,
  Vazio,
  BOTAO,
  brl,
  quantidade,
} from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { IconeMais } from "@/components/ui/icones";
import { CATEGORIAS, ORDEM_CATEGORIAS, custoUnitario, SIGLA_UNIDADE, type Categoria } from "@/core/materiais/categorias";
import { prisma } from "@/server/db/client";
import { exigirContexto, podeEditar } from "@/server/workspace/contexto";
import { Filtros } from "./_filtros";

export const metadata: Metadata = { title: "Materiais" };

export default async function PaginaMateriais({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const c = await exigirContexto();
  const sp = await searchParams;

  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const ligado = (k: string) => sp[k] === "1";

  const q = texto("q").trim();
  const categoria = texto("categoria");
  const estimados = ligado("estimados");
  const arquivados = ligado("arquivados");
  const baixos = ligado("baixos");

  const materiais = await prisma.material.findMany({
    where: {
      workspaceId: c.ws,
      arquivadoEm: arquivados ? { not: null } : null,
      ...(categoria ? { categoria: categoria as Categoria } : {}),
      ...(estimados ? { precoEstimado: true } : {}),
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" as const } },
              { marca: { contains: q, mode: "insensitive" as const } },
              { cor: { contains: q, mode: "insensitive" as const } },
              { tipoMaterial: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
  });

  const visiveis = baixos
    ? materiais.filter((m) => m.estoqueMinimo > 0 && m.estoqueAtual <= m.estoqueMinimo)
    : materiais;

  // agrupa por categoria: a prateleira dele é organizada assim, a tela também
  const grupos = ORDEM_CATEGORIAS.map((k) => ({
    categoria: k,
    itens: visiveis.filter((m) => m.categoria === k),
  })).filter((g) => g.itens.length > 0);

  const filtrando = Boolean(q || categoria || estimados || arquivados || baixos);

  return (
    <Pagina
      titulo="Materiais"
      descricao="Tudo que entra numa peça — do rolo de filamento ao pincel. O preço daqui é o que alimenta o cálculo."
      largura="larga"
      acao={
        podeEditar(c.papel) && (
          <Link href="/materiais/novo" className={BOTAO.primario}>
            <IconeMais width={16} height={16} />
            Novo material
          </Link>
        )
      }
    >
      {sp.arquivado === "1" && (
        <div className="mb-5">
          <Aviso nivel="sucesso">
            Material arquivado. Ele some da lista mas continua nas peças antigas — o custo
            daquelas peças não muda.
          </Aviso>
        </div>
      )}

      <Filtros
        q={q}
        categoria={categoria}
        estimados={estimados}
        arquivados={arquivados}
        baixos={baixos}
      />

      {visiveis.length === 0 ? (
        <Card>
          <Vazio
            icone={filtrando ? "🔍" : "📦"}
            titulo={filtrando ? "Nada com esse filtro" : "Nenhum material cadastrado"}
            acao={
              filtrando ? (
                <Link href="/materiais" className={BOTAO.secundario}>
                  Limpar filtros
                </Link>
              ) : (
                podeEditar(c.papel) && (
                  <Link href="/materiais/novo" className={BOTAO.primario}>
                    Cadastrar o primeiro
                  </Link>
                )
              )
            }
          >
            {filtrando
              ? "Tente outro termo, ou limpe os filtros para ver a lista inteira."
              : "Sem material cadastrado, o cálculo de preço não tem de onde tirar o custo."}
          </Vazio>
        </Card>
      ) : (
        <div className="space-y-8">
          {grupos.map((g) => {
            const def = CATEGORIAS[g.categoria];
            return (
              <section key={g.categoria}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto">
                  <span aria-hidden>{def.icone}</span>
                  {def.plural}
                  <span className="font-normal text-texto-suave">({g.itens.length})</span>
                </h2>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {g.itens.map((m) => {
                    const unit = custoUnitario(m.precoEmbalagem, m.tamanhoEmbalagem);
                    const acabou = m.estoqueMinimo > 0 && m.estoqueAtual <= m.estoqueMinimo;

                    return (
                      <Link key={m.id} href={`/materiais/${m.id}`}>
                        <Card className="h-full p-4 transition-colors hover:border-borda-forte hover:bg-superficie-2">
                          <div className="flex items-start gap-3">
                            {m.corHex ? (
                              <span
                                aria-hidden
                                className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-borda-forte"
                                style={{ background: m.corHex }}
                              />
                            ) : (
                              <span
                                aria-hidden
                                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-superficie-2 text-base"
                              >
                                {def.icone}
                              </span>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-texto">{m.nome}</p>
                              <p className="mt-0.5 truncate text-xs text-texto-suave">
                                {[m.marca, m.tipoMaterial, m.cor].filter(Boolean).join(" · ") ||
                                  "sem detalhes"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-end justify-between gap-2">
                            <div>
                              <p className="tabular text-sm font-semibold text-texto">
                                {brl(m.precoEmbalagem)}
                                <span className="font-normal text-texto-suave">
                                  {" "}
                                  / {m.tamanhoEmbalagem} {SIGLA_UNIDADE[m.unidade]}
                                </span>
                              </p>
                              <p className="tabular mt-0.5 text-xs text-texto-suave">
                                {unit > 0
                                  ? `${brl(unit)} por ${SIGLA_UNIDADE[m.unidade]}`
                                  : "sem preço unitário"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p
                                className={
                                  acabou
                                    ? "tabular text-sm font-bold text-prejuizo"
                                    : "tabular text-sm font-semibold text-texto"
                                }
                              >
                                {quantidade(m.estoqueAtual, m.unidade)}
                              </p>
                              <p className="text-xs text-texto-fraco">em estoque</p>
                            </div>
                          </div>

                          {(m.precoEstimado || acabou || m.arquivadoEm) && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {m.precoEstimado && <SeloEstimado campo="preço" />}
                              {acabou && <Etiqueta tom="prejuizo">repor</Etiqueta>}
                              {m.arquivadoEm && <Etiqueta tom="neutro">arquivado</Etiqueta>}
                            </div>
                          )}
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Pagina>
  );
}
