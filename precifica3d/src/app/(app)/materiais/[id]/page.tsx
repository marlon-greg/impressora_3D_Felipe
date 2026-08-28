import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Aviso,
  Card,
  CardTitulo,
  Etiqueta,
  Metrica,
  SeloEstimado,
  Tabela,
  Td,
  Th,
  BOTAO,
  brl,
  num,
  quantidade,
  tempoRelativo,
} from "@/components/ui";
import { Grade, Pagina } from "@/components/ui/pagina";
import {
  CATEGORIAS,
  SIGLA_UNIDADE,
  custoUnitario,
  metrosDeFilamento,
  type Categoria,
  type Unidade,
} from "@/core/materiais/categorias";
import { prisma } from "@/server/db/client";
import { exigirContexto, podeEditar } from "@/server/workspace/contexto";
import { acaoArquivarMaterial } from "../acoes";
import { BaixaRapida } from "../_baixa-rapida";

export const metadata: Metadata = { title: "Material" };

const ROTULO_MOV: Record<string, string> = {
  ENTRADA: "entrada",
  SAIDA: "baixa",
  AJUSTE: "correção",
};

/**
 * Atalhos de quantidade que fazem sentido para o material.
 * Baseados no tamanho da embalagem, porque 5 ml de tinta e 5 g de filamento
 * são gestos completamente diferentes.
 */
function atalhosDe(unidade: Unidade, tamanho: number): number[] {
  if (unidade === "UN") return [1, 2, 5];
  const base = unidade === "G" ? [5, 10, 25, 50, 100] : [1, 2, 5, 10, 20];
  return base.filter((v) => v <= tamanho);
}

export default async function PaginaMaterial({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const c = await exigirContexto();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const m = await prisma.material.findFirst({
    where: { id, workspaceId: c.ws },
    include: {
      movimentacoes: { orderBy: { criadoEm: "desc" }, take: 40 },
      compras: { orderBy: { data: "desc" }, take: 10 },
      _count: { select: { usosFilamento: true, usosAcabamento: true } },
    },
  });
  if (!m) notFound();

  const def = CATEGORIAS[m.categoria as Categoria];
  const unidade = m.unidade as Unidade;
  const unitario = custoUnitario(m.precoEmbalagem, m.tamanhoEmbalagem);
  const acabou = m.estoqueMinimo > 0 && m.estoqueAtual <= m.estoqueMinimo;
  const usos = m._count.usosFilamento + m._count.usosAcabamento;

  const metros =
    m.categoria === "FILAMENTO" && m.diametroMm && m.densidadeGcm3
      ? metrosDeFilamento(m.estoqueAtual, m.diametroMm, m.densidadeGcm3)
      : 0;

  // variação de preço: primeira compra registrada contra a atual
  const primeira = m.compras[m.compras.length - 1];
  const variacaoPct =
    primeira && primeira.precoEmbalagem > 0 && m.compras.length > 1
      ? ((m.precoEmbalagem - primeira.precoEmbalagem) / primeira.precoEmbalagem) * 100
      : null;

  return (
    <Pagina
      titulo={m.nome}
      voltar={{ href: "/materiais", rotulo: "Materiais" }}
      descricao={
        <span className="flex flex-wrap items-center gap-2">
          <span>
            {def.icone} {def.rotulo}
          </span>
          {[m.marca, m.tipoMaterial, m.cor].filter(Boolean).map((t) => (
            <Etiqueta key={t}>{t}</Etiqueta>
          ))}
          {m.precoEstimado && <SeloEstimado campo="preço" />}
          {m.arquivadoEm && <Etiqueta tom="neutro">arquivado</Etiqueta>}
        </span>
      }
      acao={
        podeEditar(c.papel) && (
          <div className="flex gap-2">
            <Link href={`/materiais/${m.id}/editar`} className={BOTAO.secundario}>
              Editar
            </Link>
            <form action={acaoArquivarMaterial}>
              <input type="hidden" name="id" value={m.id} />
              <button type="submit" className={BOTAO.discreto}>
                {m.arquivadoEm ? "Restaurar" : "Arquivar"}
              </button>
            </form>
          </div>
        )
      }
    >
      {(sp.criado === "1" || sp.salvo === "1" || sp.restaurado === "1") && (
        <div className="mb-5">
          <Aviso nivel="sucesso">
            {sp.criado === "1"
              ? "Material cadastrado. Já pode usar nas peças."
              : sp.restaurado === "1"
                ? "Material restaurado."
                : "Alterações salvas."}
          </Aviso>
        </div>
      )}

      {m.precoEstimado && (
        <div className="mb-5">
          <Aviso nivel="atencao" titulo="Preço estimado">
            Este valor fui eu que chutei a partir do mercado — não é o da sua nota. Enquanto
            estiver assim, toda peça que usar este material tem o custo aproximado.{" "}
            {podeEditar(c.papel) && (
              <Link href={`/materiais/${m.id}/editar`} className="font-semibold underline">
                Corrigir agora
              </Link>
            )}
          </Aviso>
        </div>
      )}

      <Grade colunas={4}>
        <Card className="p-5">
          <Metrica
            rotulo="Em estoque"
            valor={quantidade(m.estoqueAtual, unidade)}
            detalhe={
              m.estoqueMinimo > 0
                ? `mínimo: ${quantidade(m.estoqueMinimo, unidade)}`
                : "sem aviso configurado"
            }
            tom={acabou ? "prejuizo" : "lucro"}
          />
        </Card>
        <Card className="p-5">
          <Metrica
            rotulo="Custo unitário"
            valor={unitario > 0 ? brl(unitario) : "—"}
            detalhe={`por ${SIGLA_UNIDADE[unidade]}`}
            dica="É este número que entra no cálculo de cada peça."
          />
        </Card>
        <Card className="p-5">
          <Metrica
            rotulo="Valor parado"
            valor={brl(m.estoqueAtual * unitario)}
            detalhe={metros > 0 ? `≈ ${num(metros, 0)} m de filamento` : "dinheiro na prateleira"}
          />
        </Card>
        <Card className="p-5">
          <Metrica
            rotulo="Embalagem"
            valor={brl(m.precoEmbalagem)}
            detalhe={`${num(m.tamanhoEmbalagem)} ${SIGLA_UNIDADE[unidade]}${m.fornecedor ? ` · ${m.fornecedor}` : ""}`}
            tom={variacaoPct != null ? (variacaoPct > 0 ? "prejuizo" : "lucro") : "neutro"}
          />
        </Card>
      </Grade>

      {variacaoPct != null && Math.abs(variacaoPct) >= 1 && (
        <div className="mt-4">
          <Aviso nivel={variacaoPct > 0 ? "atencao" : "sucesso"}>
            Desde a primeira compra registrada, este item {variacaoPct > 0 ? "subiu" : "caiu"}{" "}
            <strong>{num(Math.abs(variacaoPct), 1)}%</strong> — de {brl(primeira.precoEmbalagem)}{" "}
            para {brl(m.precoEmbalagem)}.{" "}
            {variacaoPct > 0
              ? "As peças calculadas antes disso estão com o custo defasado."
              : "Suas peças ficaram mais lucrativas sem você mexer no preço."}
          </Aviso>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardTitulo descricao="Toda mudança de estoque fica registrada, com o saldo depois dela.">
              Extrato de movimentações
            </CardTitulo>

            {m.movimentacoes.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-texto-suave">
                Nada movimentado ainda.
              </p>
            ) : (
              <Tabela>
                <thead>
                  <tr>
                    <Th>Quando</Th>
                    <Th>O quê</Th>
                    <Th className="text-right">Quantidade</Th>
                    <Th className="text-right">Saldo depois</Th>
                    <Th>Motivo</Th>
                  </tr>
                </thead>
                <tbody>
                  {m.movimentacoes.map((mov) => (
                    <tr key={mov.id}>
                      <Td className="whitespace-nowrap text-xs text-texto-suave">
                        {tempoRelativo(mov.criadoEm)}
                      </Td>
                      <Td>
                        <Etiqueta
                          tom={
                            mov.tipo === "ENTRADA"
                              ? "lucro"
                              : mov.tipo === "SAIDA"
                                ? "prejuizo"
                                : "neutro"
                          }
                        >
                          {ROTULO_MOV[mov.tipo]}
                        </Etiqueta>
                      </Td>
                      <Td className="tabular text-right font-medium whitespace-nowrap">
                        {mov.tipo === "ENTRADA" ? "+" : mov.tipo === "SAIDA" ? "−" : "="}
                        {quantidade(mov.quantidade, unidade)}
                      </Td>
                      <Td className="tabular text-right whitespace-nowrap text-texto-suave">
                        {quantidade(mov.saldoApos, unidade)}
                      </Td>
                      <Td className="text-xs text-texto-suave">{mov.motivo ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}
          </Card>

          {m.compras.length > 1 && (
            <Card>
              <CardTitulo descricao="Cada vez que o preço mudou, uma linha aqui.">
                Histórico de preço
              </CardTitulo>
              <Tabela>
                <thead>
                  <tr>
                    <Th>Quando</Th>
                    <Th className="text-right">Embalagem</Th>
                    <Th className="text-right">Por {SIGLA_UNIDADE[unidade]}</Th>
                    <Th>Onde</Th>
                  </tr>
                </thead>
                <tbody>
                  {m.compras.map((compra) => (
                    <tr key={compra.id}>
                      <Td className="whitespace-nowrap text-xs text-texto-suave">
                        {compra.data.toLocaleDateString("pt-BR")}
                      </Td>
                      <Td className="tabular text-right whitespace-nowrap">
                        {brl(compra.precoEmbalagem)}
                        <span className="text-texto-suave">
                          {" "}
                          / {num(compra.tamanhoEmbalagem)}
                        </span>
                      </Td>
                      <Td className="tabular text-right whitespace-nowrap">
                        {brl(custoUnitario(compra.precoEmbalagem, compra.tamanhoEmbalagem))}
                      </Td>
                      <Td className="text-xs text-texto-suave">{compra.fornecedor ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {podeEditar(c.papel) && !m.arquivadoEm && (
            <Card>
              <CardTitulo descricao="O saldo muda na hora e fica no extrato.">
                Mexer no estoque
              </CardTitulo>
              <BaixaRapida
                materialId={m.id}
                unidade={unidade}
                estoqueAtual={m.estoqueAtual}
                atalhos={atalhosDe(unidade, m.tamanhoEmbalagem)}
              />
            </Card>
          )}

          <Card>
            <CardTitulo>Ficha</CardTitulo>
            <dl className="divide-y divide-borda text-sm">
              {[
                ["Categoria", `${def.icone} ${def.rotulo}`],
                ["Marca", m.marca],
                ["Tipo", m.tipoMaterial],
                ["Cor", m.cor],
                ["Fornecedor", m.fornecedor],
                m.rendimentoPecas ? ["Rende", `${num(m.rendimentoPecas)} peças`] : null,
                m.diametroMm ? ["Diâmetro", `${m.diametroMm} mm`] : null,
                m.densidadeGcm3 ? ["Densidade", `${m.densidadeGcm3} g/cm³`] : null,
                m.tempBico ? ["Bico", `${m.tempBico} °C`] : null,
                m.tempMesa ? ["Mesa", `${m.tempMesa} °C`] : null,
                ["Usado em", usos === 0 ? "nenhuma peça ainda" : `${usos} peça${usos > 1 ? "s" : ""}`],
                ["Cadastrado", m.criadoEm.toLocaleDateString("pt-BR")],
              ]
                .filter((l): l is [string, string] => Array.isArray(l) && Boolean(l[1]))
                .map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex justify-between gap-4 px-5 py-2.5">
                    <dt className="text-texto-suave">{rotulo}</dt>
                    <dd className="text-right font-medium text-texto">{valor}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          {m.notas && (
            <Card>
              <CardTitulo>Observações</CardTitulo>
              <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-texto-suave">
                {m.notas}
              </p>
            </Card>
          )}
        </div>
      </div>
    </Pagina>
  );
}
