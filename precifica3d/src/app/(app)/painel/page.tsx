import type { Metadata } from "next";
import Link from "next/link";

import {
  Aviso,
  Card,
  CardTitulo,
  Etiqueta,
  Metrica,
  Vazio,
  brl,
  horas,
  num,
  pct,
  quantidade,
  tempoRelativo,
  BOTAO,
} from "@/components/ui";
import { Grade, Pagina } from "@/components/ui/pagina";
import { IconeAlerta, IconeCaiu, IconeMais, IconeSubiu } from "@/components/ui/icones";
import { exigirContexto } from "@/server/workspace/contexto";
import { dadosPainel } from "@/server/queries/painel";

export const metadata: Metadata = { title: "Painel" };

const RECADOS: Record<string, { nivel: "sucesso" | "info" | "atencao"; texto: string }> = {
  "email-confirmado": { nivel: "sucesso", texto: "E-mail confirmado. Sua conta está ativa." },
  "boas-vindas": { nivel: "sucesso", texto: "Senha criada. Seu acesso está pronto." },
  "senha-alterada": {
    nivel: "sucesso",
    texto: "Senha alterada. As outras sessões foram encerradas.",
  },
  "sem-permissao": {
    nivel: "atencao",
    texto: "Seu papel neste ateliê só permite visualizar. Peça a quem administra para liberar.",
  },
};

const ROTULO_STATUS: Record<string, string> = {
  RASCUNHO: "rascunho",
  PRODUZIDO: "produzido",
  ANUNCIADO: "anunciado",
  VENDIDO: "vendido",
  ARQUIVADO: "arquivado",
};

export default async function PaginaPainel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const c = await exigirContexto();
  const [sp, d] = await Promise.all([searchParams, dadosPainel(c.ws)]);

  const chave = Object.keys(RECADOS).find((k) => sp[k] === "1");
  const recado = chave ? RECADOS[chave] : null;

  const primeiroNome = c.nome.split(" ")[0];
  const dolar = d.mercado["USD-BRL"];
  const petg = d.mercado["PETG-MEDIA-KG"];

  const pendencias = [
    d.pendencias.semImpressora && {
      texto: "Nenhuma impressora cadastrada — energia e depreciação ficam de fora do cálculo.",
      href: "/configuracoes/impressoras",
      acao: "Cadastrar impressora",
    },
    d.pendencias.semTarifa && {
      texto: "Sem conta de luz lançada — o R$/kWh está zerado.",
      href: "/configuracoes/energia",
      acao: "Lançar conta",
    },
    d.pendencias.semMaoDeObra && {
      texto: "Sem valor-hora de mão de obra — seu tempo está saindo de graça.",
      href: "/configuracoes/mao-de-obra",
      acao: "Definir valor-hora",
    },
    d.pendencias.materiaisEstimados > 0 && {
      texto: `${d.pendencias.materiaisEstimados} materiais ainda estão com preço estimado por mim, não com o da nota.`,
      href: "/materiais?estimados=1",
      acao: "Corrigir preços",
    },
  ].filter(Boolean) as { texto: string; href: string; acao: string }[];

  return (
    <Pagina
      titulo={`Olá, ${primeiroNome}`}
      descricao={`Como está o ${c.workspaceNome} hoje.`}
      largura="larga"
      acao={
        <Link href="/projetos/novo" className={BOTAO.primario}>
          <IconeMais width={16} height={16} />
          Nova peça
        </Link>
      }
    >
      {recado && (
        <div className="mb-6">
          <Aviso nivel={recado.nivel}>{recado.texto}</Aviso>
        </div>
      )}

      <Grade colunas={4}>
        <Card className="p-5">
          <Metrica
            rotulo="Peças cadastradas"
            valor={num(d.projetos.total)}
            detalhe={
              d.projetos.total === 0
                ? "nenhuma ainda"
                : Object.entries(d.projetos.porStatus)
                    .map(([s, n]) => `${n} ${ROTULO_STATUS[s] ?? s.toLowerCase()}`)
                    .join(" · ")
            }
          />
        </Card>
        <Card className="p-5">
          <Metrica
            rotulo="Materiais no estoque"
            valor={num(d.materiais.total)}
            detalhe={
              d.materiais.estimados > 0
                ? `${d.materiais.estimados} com preço estimado`
                : "todos com preço confirmado"
            }
            tom={d.materiais.estimados > 0 ? "atencao" : "neutro"}
          />
        </Card>
        <Card className="p-5">
          <Metrica
            rotulo="Abaixo do mínimo"
            valor={num(d.estoqueBaixo.length)}
            detalhe={d.estoqueBaixo.length === 0 ? "estoque tranquilo" : "repor antes de faltar"}
            tom={d.estoqueBaixo.length > 0 ? "prejuizo" : "lucro"}
          />
        </Card>
        <Card className="p-5">
          <Metrica
            rotulo="Dólar"
            valor={dolar ? brl(dolar.valor) : "—"}
            detalhe={
              dolar
                ? d.varDolar
                  ? `${d.varDolar.subiu ? "+" : ""}${pct(d.varDolar.variacaoPct)} em 30 dias`
                  : `coletado ${tempoRelativo(dolar.coletadoEm)}`
                : "sem coleta ainda"
            }
            tom={d.varDolar ? (d.varDolar.subiu ? "prejuizo" : "lucro") : "neutro"}
            dica="O filamento é importado ou indexado ao dólar — quando ele sobe, seu insumo sobe depois."
          />
        </Card>
      </Grade>

      {pendencias.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardTitulo descricao="Enquanto isso não estiver resolvido, o preço calculado é um chute educado.">
              O que falta para o cálculo ficar confiável
            </CardTitulo>
            <ul className="divide-y divide-borda">
              {pendencias.map((p) => (
                <li key={p.href} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <IconeAlerta width={18} height={18} className="shrink-0 text-atencao" />
                  <span className="min-w-0 flex-1 text-sm text-texto">{p.texto}</span>
                  <Link
                    href={p.href}
                    className="text-sm font-semibold text-marca-700 hover:underline dark:text-marca-400"
                  >
                    {p.acao}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ── peças recentes ── */}
        <div className="lg:col-span-2">
          <Card>
            <CardTitulo
              acao={
                <Link href="/projetos" className="text-sm font-semibold text-marca-700 hover:underline dark:text-marca-400">
                  ver todas
                </Link>
              }
            >
              Peças recentes
            </CardTitulo>

            {d.recentes.length === 0 ? (
              <Vazio
                icone="📦"
                titulo="Nenhuma peça ainda"
                acao={
                  <Link href="/projetos/novo" className={BOTAO.primario}>
                    Calcular a primeira peça
                  </Link>
                }
              >
                Cadastre uma peça e o sistema calcula quanto ela custa e por quanto vale a pena
                vender.
              </Vazio>
            ) : (
              <ul className="divide-y divide-borda">
                {d.recentes.map((p) => {
                  const snap = p.snapshots[0];
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/projetos/${p.slug}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-superficie-2"
                      >
                        {p.fotos[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.fotos[0].url}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-superficie-2 text-lg opacity-50"
                          >
                            🧩
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-texto">{p.nome}</p>
                          <p className="mt-0.5 text-xs text-texto-suave">
                            {horas(p.horasImpressao)} de impressão · atualizada{" "}
                            {tempoRelativo(p.atualizadoEm)}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          {p.precoDefinido != null ? (
                            <p className="tabular text-sm font-semibold text-texto">
                              {brl(p.precoDefinido)}
                            </p>
                          ) : snap ? (
                            <p className="tabular text-sm font-semibold text-texto-suave">
                              {brl(snap.precoIdeal)}
                            </p>
                          ) : (
                            <p className="text-xs text-texto-fraco">sem cálculo</p>
                          )}
                          <Etiqueta tom={p.status === "VENDIDO" ? "lucro" : "neutro"}>
                            {ROTULO_STATUS[p.status] ?? p.status}
                          </Etiqueta>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* ── coluna lateral ── */}
        <div className="space-y-6">
          {d.estoqueBaixo.length > 0 && (
            <Card>
              <CardTitulo descricao="Chegou no mínimo que você definiu.">
                Repor estoque
              </CardTitulo>
              <ul className="divide-y divide-borda">
                {d.estoqueBaixo.slice(0, 6).map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/materiais/${m.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-superficie-2"
                    >
                      {m.corHex && (
                        <span
                          aria-hidden
                          className="h-4 w-4 shrink-0 rounded-full border border-borda-forte"
                          style={{ background: m.corHex }}
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-texto">{m.nome}</span>
                      <span className="tabular shrink-0 text-xs font-semibold text-prejuizo">
                        {quantidade(m.estoqueAtual, m.unidade)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardTitulo
              descricao={
                petg
                  ? `Mediana de mercado, coletada ${tempoRelativo(petg.coletadoEm)}.`
                  : "Ainda sem coleta de preço."
              }
              acao={
                <Link href="/mercado" className="text-sm font-semibold text-marca-700 hover:underline dark:text-marca-400">
                  detalhes
                </Link>
              }
            >
              Preço do filamento
            </CardTitulo>
            <div className="px-5 py-5">
              {petg ? (
                <>
                  <Metrica
                    rotulo="PETG por quilo"
                    valor={brl(petg.valor)}
                    detalhe={
                      d.varPetg
                        ? `${d.varPetg.subiu ? "subiu" : "caiu"} ${pct(Math.abs(d.varPetg.variacaoPct))} em 30 dias`
                        : "sem histórico para comparar"
                    }
                    tom={d.varPetg ? (d.varPetg.subiu ? "prejuizo" : "lucro") : "neutro"}
                  />
                  {d.varPetg && (
                    <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-texto-suave">
                      {d.varPetg.subiu ? (
                        <IconeSubiu width={14} height={14} className="mt-0.5 shrink-0 text-prejuizo" />
                      ) : (
                        <IconeCaiu width={14} height={14} className="mt-0.5 shrink-0 text-lucro" />
                      )}
                      {d.varPetg.subiu
                        ? "Seu próximo rolo tende a vir mais caro. Recalcule as peças antes de renovar anúncio."
                        : "Insumo mais barato que no mês passado — sua margem melhora sem mexer no preço."}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm leading-relaxed text-texto-suave">
                  A coleta de preços ainda não rodou. Ela busca o preço praticado nas lojas
                  brasileiras e serve de referência para conferir se você está comprando bem.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardTitulo>Últimas movimentações</CardTitulo>
            {d.movimentacoes.length === 0 ? (
              <p className="px-5 py-6 text-sm text-texto-suave">
                Nenhuma entrada ou baixa registrada ainda.
              </p>
            ) : (
              <ul className="divide-y divide-borda">
                {d.movimentacoes.map((m) => (
                  <li key={m.id} className="flex items-baseline gap-3 px-5 py-2.5">
                    <span
                      className={
                        m.tipo === "ENTRADA"
                          ? "tabular shrink-0 text-xs font-semibold text-lucro"
                          : m.tipo === "SAIDA"
                            ? "tabular shrink-0 text-xs font-semibold text-prejuizo"
                            : "tabular shrink-0 text-xs font-semibold text-texto-suave"
                      }
                    >
                      {m.tipo === "ENTRADA" ? "+" : m.tipo === "SAIDA" ? "−" : "="}
                      {quantidade(m.quantidade, m.material.unidade)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-texto">
                      {m.material.nome}
                    </span>
                    <span className="shrink-0 text-xs text-texto-fraco">
                      {tempoRelativo(m.criadoEm)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {d.alertas.length > 0 && (
            <Card>
              <CardTitulo>Alertas</CardTitulo>
              <ul className="divide-y divide-borda">
                {d.alertas.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-texto">{a.titulo}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-texto-suave">{a.mensagem}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </Pagina>
  );
}
