import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Aviso,
  Card,
  CardTitulo,
  Etiqueta,
  BOTAO,
  brl,
  horas,
  num,
  pct,
  tempoRelativo,
} from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { prisma } from "@/server/db/client";
import { exigirContexto, podeEditar } from "@/server/workspace/contexto";
import { catalogo, rascunhoDe } from "@/server/queries/projetos";
import { montarEntrada } from "@/core/pricing/montar";
import { precificar, analisarPreco } from "@/core/pricing/calculator";
import { ResultadoCompleto } from "../_resultado";
import { DefinirPreco, BaixarInsumos } from "../_acoes-peca";
import { acaoMudarStatus } from "../acoes";
import type { StatusProjeto } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Peça" };

const PROXIMO_STATUS: Record<string, { alvo: StatusProjeto; rotulo: string }[]> = {
  RASCUNHO: [{ alvo: "PRODUZIDO", rotulo: "Marcar como produzida" }],
  PRODUZIDO: [
    { alvo: "ANUNCIADO", rotulo: "Marcar como anunciada" },
    { alvo: "VENDIDO", rotulo: "Marcar como vendida" },
  ],
  ANUNCIADO: [{ alvo: "VENDIDO", rotulo: "Marcar como vendida" }],
  VENDIDO: [{ alvo: "ANUNCIADO", rotulo: "Voltar para anunciada" }],
  ARQUIVADO: [{ alvo: "RASCUNHO", rotulo: "Desarquivar" }],
};

const ROTULO_STATUS: Record<string, string> = {
  RASCUNHO: "rascunho",
  PRODUZIDO: "produzida",
  ANUNCIADO: "anunciada",
  VENDIDO: "vendida",
  ARQUIVADO: "arquivada",
};

export default async function PaginaPeca({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const c = await exigirContexto();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);

  const [cat, rascunho, projeto] = await Promise.all([
    catalogo(c.ws),
    rascunhoDe(c.ws, slug),
    prisma.project.findFirst({
      where: { workspaceId: c.ws, slug },
      include: {
        printer: { select: { nome: true } },
        snapshots: { orderBy: { criadoEm: "desc" }, take: 5 },
        fotos: { orderBy: [{ capa: "desc" }, { ordem: "asc" }] },
        _count: { select: { filamentos: true, materiais: true } },
      },
    }),
  ]);

  if (!rascunho || !projeto) notFound();

  // recalculado AGORA, com os preços de hoje. O snapshot guardado é a foto do
  // dia em que ele calculou — comparar os dois é o que revela que o filamento
  // subiu e o preço do anúncio ficou defasado.
  const r = precificar(montarEntrada(rascunho, cat));
  const ultimo = projeto.snapshots[0];
  const deltaCusto = ultimo ? r.custoTotal - ultimo.custoTotal : 0;
  const custoMudou = ultimo != null && Math.abs(deltaCusto) >= 0.01;

  const analise =
    projeto.precoDefinido != null
      ? analisarPreco(r, projeto.precoDefinido)
      : projeto.precoVendaAtual != null
        ? analisarPreco(r, projeto.precoVendaAtual)
        : null;

  const insumos = projeto._count.filamentos + projeto._count.materiais;
  const editavel = podeEditar(c.papel);

  return (
    <Pagina
      titulo={projeto.nome}
      largura="larga"
      voltar={{ href: "/projetos", rotulo: "Peças" }}
      descricao={
        <span className="flex flex-wrap items-center gap-2">
          <Etiqueta tom={projeto.status === "VENDIDO" ? "lucro" : "neutro"}>
            {ROTULO_STATUS[projeto.status]}
          </Etiqueta>
          {projeto.categoria && <Etiqueta>{projeto.categoria}</Etiqueta>}
          {projeto.printer && <Etiqueta>{projeto.printer.nome}</Etiqueta>}
          <span className="text-texto-suave">
            {horas(projeto.horasImpressao)} de impressão
            {projeto.numeroPecas > 1 && ` · ${projeto.numeroPecas} partes`}
          </span>
        </span>
      }
      acao={
        editavel && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/projetos/${slug}/editar`} className={BOTAO.secundario}>
              Editar
            </Link>
            {(PROXIMO_STATUS[projeto.status] ?? []).map((s) => (
              <form key={s.alvo} action={acaoMudarStatus}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="status" value={s.alvo} />
                <button type="submit" className={BOTAO.discreto}>
                  {s.rotulo}
                </button>
              </form>
            ))}
          </div>
        )
      }
    >
      {(sp.criado === "1" || sp.salvo === "1" || sp.status === "1") && (
        <div className="mb-6">
          <Aviso nivel="sucesso">
            {sp.criado === "1"
              ? "Peça salva com o cálculo do momento. Sempre que você abrir esta tela, o preço é refeito com os valores de hoje."
              : sp.status === "1"
                ? "Situação atualizada."
                : "Alterações salvas e novo cálculo guardado."}
          </Aviso>
        </div>
      )}

      {custoMudou && (
        <div className="mb-6">
          <Aviso nivel={deltaCusto > 0 ? "atencao" : "sucesso"} titulo="O custo mudou desde o último cálculo">
            Quando você calculou, {tempoRelativo(ultimo.criadoEm)}, esta peça custava{" "}
            {brl(ultimo.custoTotal)}. Com os preços de hoje ela custa {brl(r.custoTotal)} —{" "}
            {deltaCusto > 0 ? "subiu" : "caiu"} {brl(Math.abs(deltaCusto))}.{" "}
            {deltaCusto > 0
              ? "Se o preço do anúncio continuou o mesmo, sua margem encolheu."
              : "Sua margem melhorou sem você mexer no preço."}
          </Aviso>
        </div>
      )}

      {analise && (
        <div className="mb-6">
          <Aviso
            nivel={analise.prejuizo ? "critico" : analise.abaixoDoMinimo ? "atencao" : "sucesso"}
            titulo={
              analise.prejuizo
                ? "Este preço dá prejuízo"
                : analise.abaixoDoMinimo
                  ? "Preço abaixo do mínimo seguro"
                  : "Preço saudável"
            }
          >
            Vendendo por {brl(analise.preco)}, você recebe {brl(analise.recebido)} depois das
            taxas. Tirando o custo de {brl(r.custoTotal)},{" "}
            {analise.prejuizo ? (
              <>
                <strong>faltam {brl(Math.abs(analise.lucro))}</strong> — cada peça vendida assim
                tira dinheiro do seu bolso.
              </>
            ) : (
              <>
                sobram <strong>{brl(analise.lucro)}</strong> ({pct(analise.margemPct)} do preço).
              </>
            )}
          </Aviso>
        </div>
      )}

      <ResultadoCompleto r={r} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitulo descricao="O que entra nesta peça e quanto cada item custa hoje.">
              Ficha técnica
            </CardTitulo>
            <div className="divide-y divide-borda">
              {rascunho.filamentos.length > 0 && (
                <div className="px-5 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-texto-suave">
                    Filamento
                  </p>
                  <ul className="space-y-1.5">
                    {rascunho.filamentos.map((f, i) => {
                      const m = cat.materiais.find((x) => x.id === f.materialId);
                      return (
                        <li key={i} className="flex justify-between gap-4 text-sm">
                          <span className="min-w-0 truncate text-texto">
                            {m ? (
                              <Link href={`/materiais/${m.id}`} className="hover:underline">
                                {m.nome}
                              </Link>
                            ) : (
                              "material removido"
                            )}
                          </span>
                          <span className="tabular shrink-0 text-texto-suave">
                            {num(f.gramas)} g
                            {f.desperdicioPct > 0 && ` + ${pct(f.desperdicioPct, 0)} de perda`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {rascunho.materiais.length > 0 && (
                <div className="px-5 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-texto-suave">
                    Acabamento
                  </p>
                  <ul className="space-y-1.5">
                    {rascunho.materiais.map((x, i) => {
                      const m = cat.materiais.find((y) => y.id === x.materialId);
                      return (
                        <li key={i} className="flex justify-between gap-4 text-sm">
                          <span className="min-w-0 truncate text-texto">
                            {m ? (
                              <Link href={`/materiais/${m.id}`} className="hover:underline">
                                {m.nome}
                              </Link>
                            ) : (
                              "material removido"
                            )}
                          </span>
                          <span className="tabular shrink-0 text-texto-suave">
                            {num(x.quantidade, 1)} {m ? m.unidade.toLowerCase() : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {rascunho.trabalhos.length > 0 && (
                <div className="px-5 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-texto-suave">
                    Seu tempo
                  </p>
                  <ul className="space-y-1.5">
                    {rascunho.trabalhos.map((t, i) => (
                      <li key={i} className="flex justify-between gap-4 text-sm">
                        <span className="min-w-0 truncate text-texto">
                          {t.descricao}
                          {t.antesDaImpressao && (
                            <span className="ml-1.5 text-xs text-texto-fraco">
                              (antes de imprimir)
                            </span>
                          )}
                        </span>
                        <span className="tabular shrink-0 text-texto-suave">
                          {horas(t.horas)} × {brl(t.valorHora)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {projeto.notas && (
                <div className="px-5 py-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-texto-suave">
                    Observações
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-texto-suave">
                    {projeto.notas}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {projeto.snapshots.length > 1 && (
            <Card>
              <CardTitulo descricao="Cada vez que você salvou, o cálculo daquele dia ficou guardado.">
                Histórico de cálculo
              </CardTitulo>
              <ul className="divide-y divide-borda">
                {projeto.snapshots.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3">
                    <span className="text-xs text-texto-suave">
                      {s.criadoEm.toLocaleDateString("pt-BR")}
                    </span>
                    <span className="tabular text-sm text-texto">
                      custo {brl(s.custoTotal)}
                    </span>
                    <span className="tabular text-sm font-medium text-texto">
                      ideal {brl(s.precoIdeal)}
                    </span>
                    <span className="tabular ml-auto text-xs text-texto-suave">
                      {pct(s.margemRealPct)} de margem
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {editavel && (
            <Card>
              <CardTitulo descricao="Fixe o preço que você realmente vai cobrar.">
                Preço adotado
              </CardTitulo>
              <DefinirPreco
                slug={slug}
                atual={projeto.precoDefinido}
                sugerido={r.faixas.ideal.preco}
              />
            </Card>
          )}

          {editavel && insumos > 0 && (
            <Card>
              <CardTitulo>Estoque</CardTitulo>
              <BaixarInsumos slug={slug} itens={insumos} />
            </Card>
          )}

          <Card>
            <CardTitulo>Fotos</CardTitulo>
            {projeto.fotos.length === 0 ? (
              <p className="px-5 py-6 text-sm leading-relaxed text-texto-suave">
                Nenhuma foto ainda.{" "}
                {editavel && (
                  <Link href={`/projetos/${slug}/fotos`} className="font-semibold text-marca-700 hover:underline dark:text-marca-400">
                    Adicionar
                  </Link>
                )}
              </p>
            ) : (
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  {projeto.fotos.slice(0, 6).map((f) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={f.id}
                      src={f.url}
                      alt={f.legenda ?? ""}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
                {editavel && (
                  <Link
                    href={`/projetos/${slug}/fotos`}
                    className="mt-3 block text-center text-sm font-semibold text-marca-700 hover:underline dark:text-marca-400"
                  >
                    Gerenciar fotos ({projeto.fotos.length})
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Pagina>
  );
}
