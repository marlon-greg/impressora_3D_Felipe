"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";

import { Campo, Selecao, BotaoEnviar } from "@/components/forms/campos";
import { Aviso, Card, CardTitulo, Etiqueta, brl, pct } from "@/components/ui";
import { Secao } from "@/components/ui/pagina";
import { precificar } from "@/core/pricing/calculator";
import { montarEntrada, type Catalogo, type Rascunho } from "@/core/pricing/montar";
import { SIGLA_UNIDADE, CATEGORIAS, type Categoria } from "@/core/materiais/categorias";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoSalvarProjeto } from "./acoes";
import { CampoNum, Chave, Linha } from "./_campos";
import { FaixasDePreco, DetalhamentoCusto, PainelRisco, Avisos } from "./_resultado";

/**
 * Formulário da peça.
 *
 * O cálculo roda aqui no navegador, a cada tecla: o motor é TypeScript puro e
 * não toca no banco, então dá para mostrar o preço mudando enquanto ele
 * aumenta as gramas. Isso é o que transforma a ferramenta de "calculadora que
 * dá um número" em algo que ensina onde o dinheiro está indo.
 *
 * Quem grava é o servidor, que refaz a mesma conta com os preços do banco.
 */

const CATEGORIAS_ACABAMENTO: Categoria[] = [
  "TINTA", "PRIMER", "VERNIZ", "MASSA", "COLA", "ABRASIVO", "PINCEL", "FERRAGEM", "EMBALAGEM", "OUTRO",
];

export function FormularioProjeto({
  cat,
  inicial,
  id,
}: {
  cat: Catalogo;
  inicial: Rascunho;
  id?: string;
}) {
  const [estado, enviar] = useActionState(acaoSalvarProjeto, VAZIO);
  const [r, setR] = useState<Rascunho>(inicial);

  /** Altera um campo do rascunho sem reescrever o objeto inteiro na chamada. */
  const set = <K extends keyof Rascunho>(chave: K, valor: Rascunho[K]) =>
    setR((atual) => ({ ...atual, [chave]: valor }));

  const resultado = useMemo(() => precificar(montarEntrada(r, cat)), [r, cat]);

  const filamentosDisponiveis = cat.materiais.filter((m) => m.categoria === "FILAMENTO");
  const acabamentosDisponiveis = cat.materiais.filter((m) =>
    CATEGORIAS_ACABAMENTO.includes(m.categoria as Categoria),
  );

  const pronto = r.nome.trim().length >= 2 && r.horasImpressao > 0;

  return (
    <form action={enviar} className="lg:grid lg:grid-cols-[1fr_22rem] lg:gap-8 lg:items-start">
      {id && <input type="hidden" name="id" value={id} />}
      {/* o rascunho inteiro vai como JSON: as listas crescem e encolhem, e
          campos indexados no HTML seriam pior de validar do lado de lá */}
      <input type="hidden" name="rascunho" value={JSON.stringify(r)} />

      <div className="min-w-0">
        {estado.mensagem && !estado.ok && (
          <div className="mb-5">
            <Aviso nivel="critico">{estado.mensagem}</Aviso>
          </div>
        )}

        {/* ── 1. a peça ── */}
        <Secao titulo="A peça" numero={1}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Nome"
              value={r.nome}
              onChange={(e) => set("nome", e.target.value)}
              obrigatorio
              autoFocus
              placeholder="Suporte de fone gamer"
              className="sm:col-span-2"
            />
            <Campo
              rotulo="Categoria"
              value={r.categoria}
              onChange={(e) => set("categoria", e.target.value)}
              placeholder="Decoração, utilidade, action figure"
              dica="Livre. Serve só para você achar depois."
            />
            <Campo
              rotulo="Onde você vende"
              value={r.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder="Encomenda, feira, Mercado Livre"
            />
          </div>

          <p className="mb-2 mt-5 text-sm font-medium text-texto">Tamanho da peça montada</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoNum rotulo="Largura" valor={r.larguraMm} aoMudar={(n) => set("larguraMm", n || null)} unidade="mm" />
            <CampoNum rotulo="Profundidade" valor={r.profundidadeMm} aoMudar={(n) => set("profundidadeMm", n || null)} unidade="mm" />
            <CampoNum rotulo="Altura" valor={r.alturaMm} aoMudar={(n) => set("alturaMm", n || null)} unidade="mm" />
          </div>
          <p className="mt-2 text-xs text-texto-suave">
            Opcional, mas entra no risco: peça grande empena mais e a falha custa mais caro.
          </p>
        </Secao>

        {/* ── 2. arquivo ── */}
        <Secao
          titulo="De onde veio o arquivo"
          numero={2}
          descricao="Modelo comprado tem custo. Modelo que você desenhou tem o seu tempo — e nenhum dos dois costuma entrar na conta."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao
              rotulo="Origem"
              value={r.origemArquivo}
              onChange={(e) => set("origemArquivo", e.target.value as Rascunho["origemArquivo"])}
            >
              <option value="PRONTO">Baixei pronto</option>
              <option value="MODIFICADO">Baixei e modifiquei</option>
              <option value="DO_ZERO">Modelei do zero</option>
            </Selecao>

            <CampoNum
              rotulo="Custo do arquivo"
              valor={r.custoArquivo}
              aoMudar={(n) => set("custoArquivo", n)}
              unidade="R$"
              dica="Compra ou licença. Divida pelo número de peças que pretende vender."
            />

            <Campo
              rotulo="Fonte"
              value={r.fonteArquivo}
              onChange={(e) => set("fonteArquivo", e.target.value)}
              placeholder="Printables, Thingiverse, MakerWorld, meu"
              className="sm:col-span-2"
            />
          </div>
        </Secao>

        {/* ── 3. impressão ── */}
        <Secao titulo="Impressão" numero={3}>
          {cat.impressoras.length === 0 ? (
            <Aviso nivel="critico" titulo="Nenhuma impressora cadastrada">
              Sem impressora não há energia nem depreciação no cálculo, e o custo sai bem menor
              do que a realidade.{" "}
              <Link href="/configuracoes/impressoras" className="font-semibold underline">
                Cadastrar agora
              </Link>
            </Aviso>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Selecao
                rotulo="Impressora"
                value={r.printerId ?? ""}
                onChange={(e) => set("printerId", e.target.value || null)}
                obrigatorio
                className="sm:col-span-2"
              >
                <option value="">Escolha a impressora</option>
                {cat.impressoras.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {p.potenciaWatts} W
                  </option>
                ))}
              </Selecao>

              <CampoNum
                rotulo="Tempo de impressão"
                valor={r.horasImpressao}
                aoMudar={(n) => set("horasImpressao", n)}
                unidade="h"
                obrigatorio
                dica="O que o fatiador estima. 2 h 30 min vira 2,5."
              />

              <CampoNum
                rotulo="Partes impressas"
                valor={r.numeroPecas}
                aoMudar={(n) => set("numeroPecas", Math.max(1, Math.round(n)))}
                unidade="partes"
                dica="Se a peça é montada de vários pedaços, o risco sobe: falhar um compromete o conjunto."
              />

              <CampoNum
                rotulo="Preparo e fatiamento"
                valor={r.horasPreparo}
                aoMudar={(n) => set("horasPreparo", n)}
                unidade="h"
                dica="Posicionar, gerar suporte, fatiar, tirar da mesa."
              />
            </div>
          )}
        </Secao>

        {/* ── 4. filamento ── */}
        <Secao
          titulo="Filamento"
          numero={4}
          descricao="Os gramas que o fatiador informa, mais o que vira lixo: purga de troca de cor, brim e suporte."
        >
          {filamentosDisponiveis.length === 0 ? (
            <Aviso nivel="atencao">
              Nenhum filamento cadastrado.{" "}
              <Link href="/materiais/novo" className="font-semibold underline">
                Cadastre um rolo
              </Link>{" "}
              para o custo do plástico entrar na conta.
            </Aviso>
          ) : (
            <div className="space-y-3">
              {r.filamentos.map((f, i) => {
                const m = cat.materiais.find((x) => x.id === f.materialId);
                const custo = m
                  ? (f.gramas * (1 + f.desperdicioPct / 100) * m.precoEmbalagem) / m.tamanhoEmbalagem
                  : 0;
                return (
                  <Linha
                    key={i}
                    aoRemover={() =>
                      set("filamentos", r.filamentos.filter((_, j) => j !== i))
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                      <Selecao
                        rotulo="Rolo"
                        value={f.materialId}
                        onChange={(e) => {
                          const lista = [...r.filamentos];
                          lista[i] = { ...f, materialId: e.target.value };
                          set("filamentos", lista);
                        }}
                      >
                        {filamentosDisponiveis.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nome}
                            {x.precoEstimado ? " (preço estimado)" : ""}
                          </option>
                        ))}
                      </Selecao>

                      <CampoNum
                        rotulo="Gramas"
                        valor={f.gramas}
                        aoMudar={(n) => {
                          const lista = [...r.filamentos];
                          lista[i] = { ...f, gramas: n };
                          set("filamentos", lista);
                        }}
                        unidade="g"
                      />

                      <CampoNum
                        rotulo="Desperdício"
                        valor={f.desperdicioPct}
                        aoMudar={(n) => {
                          const lista = [...r.filamentos];
                          lista[i] = { ...f, desperdicioPct: n };
                          set("filamentos", lista);
                        }}
                        unidade="%"
                      />
                    </div>

                    {custo > 0 && (
                      <p className="tabular mt-2 text-xs text-texto-suave">
                        {brl(custo)} de plástico
                        {m?.estoqueAtual != null && (
                          <>
                            {" · "}
                            {m.estoqueAtual >= f.gramas * (1 + f.desperdicioPct / 100) ? (
                              <span className="text-lucro">tem no estoque</span>
                            ) : (
                              <span className="text-prejuizo">
                                estoque insuficiente ({m.estoqueAtual} g)
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    )}
                  </Linha>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  set("filamentos", [
                    ...r.filamentos,
                    {
                      materialId: filamentosDisponiveis[0].id,
                      gramas: 0,
                      // 5% cobre brim e o começo de purga sem exagerar
                      desperdicioPct: r.multiCor ? 15 : 5,
                    },
                  ])
                }
                className="w-full rounded-lg border border-dashed border-borda-forte px-4 py-3 text-sm font-medium text-texto-suave hover:border-marca-600 hover:text-marca-700 dark:hover:text-marca-400"
              >
                + adicionar filamento
              </button>
            </div>
          )}
        </Secao>

        {/* ── 5. acabamento ── */}
        <Secao
          titulo="Acabamento"
          numero={5}
          descricao="Marque o que a peça leva e lance quanto de cada material vai. Tinta e primer somem rápido e quase nunca entram no preço."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Chave rotulo="Lixamento" marcado={r.fazLixamento} aoMudar={(v) => set("fazLixamento", v)} />
            <Chave rotulo="Primer" marcado={r.fazPrimer} aoMudar={(v) => set("fazPrimer", v)} />
            <Chave rotulo="Pintura" marcado={r.fazPintura} aoMudar={(v) => set("fazPintura", v)} />
            <Chave rotulo="Verniz" marcado={r.fazVerniz} aoMudar={(v) => set("fazVerniz", v)} />
            <Chave rotulo="Montagem" marcado={r.fazMontagem} aoMudar={(v) => set("fazMontagem", v)} />
          </div>

          {acabamentosDisponiveis.length > 0 && (
            <div className="mt-4 space-y-3">
              {r.materiais.map((x, i) => {
                const m = cat.materiais.find((y) => y.id === x.materialId);
                const custo = m
                  ? m.rendimentoPecas && m.rendimentoPecas > 0
                    ? m.precoEmbalagem / m.rendimentoPecas
                    : (x.quantidade * m.precoEmbalagem) / m.tamanhoEmbalagem
                  : 0;
                const porPeca = Boolean(m?.rendimentoPecas && m.rendimentoPecas > 0);

                return (
                  <Linha
                    key={i}
                    aoRemover={() => set("materiais", r.materiais.filter((_, j) => j !== i))}
                  >
                    <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                      <Selecao
                        rotulo="Material"
                        value={x.materialId}
                        onChange={(e) => {
                          const lista = [...r.materiais];
                          lista[i] = { ...x, materialId: e.target.value };
                          set("materiais", lista);
                        }}
                      >
                        {acabamentosDisponiveis.map((y) => (
                          <option key={y.id} value={y.id}>
                            {CATEGORIAS[y.categoria as Categoria].icone} {y.nome}
                          </option>
                        ))}
                      </Selecao>

                      <CampoNum
                        rotulo={porPeca ? "Peças que rende" : "Quantidade"}
                        valor={x.quantidade}
                        aoMudar={(n) => {
                          const lista = [...r.materiais];
                          lista[i] = { ...x, quantidade: n };
                          set("materiais", lista);
                        }}
                        unidade={m ? SIGLA_UNIDADE[m.unidade] : ""}
                        dica={porPeca ? "Item indivisível: o custo é rateado." : undefined}
                      />
                    </div>
                    {custo > 0 && (
                      <p className="tabular mt-2 text-xs text-texto-suave">{brl(custo)} nesta peça</p>
                    )}
                  </Linha>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  set("materiais", [
                    ...r.materiais,
                    { materialId: acabamentosDisponiveis[0].id, quantidade: 0 },
                  ])
                }
                className="w-full rounded-lg border border-dashed border-borda-forte px-4 py-3 text-sm font-medium text-texto-suave hover:border-marca-600 hover:text-marca-700 dark:hover:text-marca-400"
              >
                + adicionar material de acabamento
              </button>
            </div>
          )}
        </Secao>

        {/* ── 6. mão de obra ── */}
        <Secao
          titulo="Seu tempo"
          numero={6}
          descricao="O custo mais esquecido do 3D. Hora de trabalho que você não cobra é desconto que você dá sem perceber."
        >
          {cat.maoDeObra.length === 0 && (
            <div className="mb-4">
              <Aviso nivel="atencao">
                Nenhum valor-hora definido.{" "}
                <Link href="/configuracoes/mao-de-obra" className="font-semibold underline">
                  Defina quanto vale sua hora
                </Link>{" "}
                — sem isso o seu trabalho entra como zero.
              </Aviso>
            </div>
          )}

          <div className="space-y-3">
            {r.trabalhos.map((t, i) => (
              <Linha key={i} aoRemover={() => set("trabalhos", r.trabalhos.filter((_, j) => j !== i))}>
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                  <Campo
                    rotulo="O que você faz"
                    value={t.descricao}
                    onChange={(e) => {
                      const lista = [...r.trabalhos];
                      lista[i] = { ...t, descricao: e.target.value };
                      set("trabalhos", lista);
                    }}
                    placeholder="Lixar e pintar"
                  />
                  <CampoNum
                    rotulo="Horas"
                    valor={t.horas}
                    aoMudar={(n) => {
                      const lista = [...r.trabalhos];
                      lista[i] = { ...t, horas: n };
                      set("trabalhos", lista);
                    }}
                    unidade="h"
                  />
                  <CampoNum
                    rotulo="Valor da hora"
                    valor={t.valorHora}
                    aoMudar={(n) => {
                      const lista = [...r.trabalhos];
                      lista[i] = { ...t, valorHora: n };
                      set("trabalhos", lista);
                    }}
                    unidade="R$"
                  />
                </div>
                <div className="mt-3">
                  <Chave
                    rotulo="Feito antes de imprimir"
                    descricao="Modelagem e preparo não se perdem se a peça falhar — só o que vem depois entra na reserva de refugo."
                    marcado={t.antesDaImpressao}
                    aoMudar={(v) => {
                      const lista = [...r.trabalhos];
                      lista[i] = { ...t, antesDaImpressao: v };
                      set("trabalhos", lista);
                    }}
                  />
                </div>
              </Linha>
            ))}

            <div className="flex flex-wrap gap-2">
              {cat.maoDeObra.map((mo) => (
                <button
                  key={mo.id}
                  type="button"
                  onClick={() =>
                    set("trabalhos", [
                      ...r.trabalhos,
                      {
                        laborRateId: mo.id,
                        descricao: mo.nome,
                        horas: 0,
                        valorHora: mo.valorHora,
                        antesDaImpressao: /model|prepar|fatia/i.test(mo.nome),
                      },
                    ])
                  }
                  className="rounded-lg border border-dashed border-borda-forte px-3 py-2.5 text-sm font-medium text-texto-suave hover:border-marca-600 hover:text-marca-700 dark:hover:text-marca-400"
                >
                  + {mo.nome}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  set("trabalhos", [
                    ...r.trabalhos,
                    {
                      laborRateId: null,
                      descricao: "",
                      horas: 0,
                      valorHora: cat.maoDeObra[0]?.valorHora ?? 0,
                      antesDaImpressao: false,
                    },
                  ])
                }
                className="rounded-lg border border-dashed border-borda-forte px-3 py-2.5 text-sm font-medium text-texto-suave hover:border-marca-600 hover:text-marca-700 dark:hover:text-marca-400"
              >
                + outro trabalho
              </button>
            </div>
          </div>
        </Secao>

        {/* ── 7. risco ── */}
        <Secao
          titulo="Complexidade e risco"
          numero={7}
          descricao="Marque o que se aplica. Quanto maior a chance de refazer, mais o sistema reserva no preço — é o que impede que uma peça perdida coma o lucro de outras cinco."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Chave rotulo="Precisa de suporte" descricao="Marca a peça e pode descolar durante a impressão." marcado={r.precisaSuporte} aoMudar={(v) => set("precisaSuporte", v)} />
            <Chave rotulo="Paredes finas" descricao="Quebra fácil no manuseio e no acabamento." marcado={r.paredesFinas} aoMudar={(v) => set("paredesFinas", v)} />
            <Chave rotulo="Peças móveis" descricao="Tolerância apertada — pode travar e perder o conjunto." marcado={r.pecasMoveis} aoMudar={(v) => set("pecasMoveis", v)} />
            <Chave rotulo="Troca de cor" descricao="Purga desperdiça material e a troca pode falhar." marcado={r.multiCor} aoMudar={(v) => set("multiCor", v)} />
            <Chave rotulo="Encaixe preciso" descricao="Se não fechar, o conjunto inteiro é refeito." marcado={r.encaixePreciso} aoMudar={(v) => set("encaixePreciso", v)} />
            <Chave rotulo="Peça alta" descricao="Risco de tombar ou empenar no topo." marcado={r.impressaoAlta} aoMudar={(v) => set("impressaoAlta", v)} />
          </div>

          <div className="mt-4">
            <Chave
              rotulo="Definir a taxa de refugo eu mesmo"
              descricao="Só se você já tem histórico dessa peça. O cálculo automático costuma acertar melhor do que a intuição."
              marcado={r.refugoManualPct != null}
              aoMudar={(v) => set("refugoManualPct", v ? 10 : null)}
            />
          </div>

          {r.refugoManualPct != null && (
            <div className="mt-3 max-w-xs">
              <CampoNum
                rotulo="Taxa de refugo"
                valor={r.refugoManualPct}
                aoMudar={(n) => set("refugoManualPct", n)}
                unidade="%"
                dica="De cada 10 impressões, quantas você joga fora? 1 em 10 = 10%."
              />
            </div>
          )}
        </Secao>

        {/* ── 8. comercial ── */}
        <Secao
          titulo="Margem e taxas"
          numero={8}
          descricao="As taxas saem por cima do preço, nunca da margem: se o marketplace fica com 15%, o preço precisa subir para você receber o que planejou."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao
              rotulo="Como você pensa a margem"
              value={r.modoMargem}
              onChange={(e) => set("modoMargem", e.target.value as Rascunho["modoMargem"])}
              dica={
                r.modoMargem === "MARKUP"
                  ? "Markup: quanto você põe em cima do custo. 60% = 1,6× o custo."
                  : "Margem líquida: quanto do preço final é lucro. 60% = 2,5× o custo."
              }
            >
              <option value="MARKUP">Markup — ponho X% em cima do custo</option>
              <option value="MARGEM_LIQUIDA">Margem líquida — X% do preço é meu lucro</option>
            </Selecao>

            <CampoNum
              rotulo={r.modoMargem === "MARKUP" ? "Markup" : "Margem líquida"}
              valor={r.margemPct}
              aoMudar={(n) => set("margemPct", n)}
              unidade="%"
            />

            <CampoNum rotulo="Taxa do canal de venda" valor={r.taxaCanalPct} aoMudar={(n) => set("taxaCanalPct", n)} unidade="%" dica="Mercado Livre, Shopee, Elo7." />
            <CampoNum rotulo="Taxa de pagamento" valor={r.taxaPagamentoPct} aoMudar={(n) => set("taxaPagamentoPct", n)} unidade="%" dica="Maquininha, Pix pago, link de pagamento." />
            <CampoNum rotulo="Imposto" valor={r.impostoPct} aoMudar={(n) => set("impostoPct", n)} unidade="%" dica="MEI costuma ficar em 0 aqui." />
            <CampoNum rotulo="Embalagem" valor={r.embalagemCusto} aoMudar={(n) => set("embalagemCusto", n)} unidade="R$" />
            <CampoNum rotulo="Frete embutido" valor={r.freteEmbutido} aoMudar={(n) => set("freteEmbutido", n)} unidade="R$" dica="Só se você oferece 'frete grátis' e absorve o custo." />
            <CampoNum rotulo="Por quanto você vende hoje" valor={r.precoVendaAtual} aoMudar={(n) => set("precoVendaAtual", n || null)} unidade="R$" dica="Para comparar com o que o cálculo sugere." />
          </div>

          <div className="mt-4">
            <label htmlFor="notas" className="mb-1.5 block text-sm font-medium text-texto">
              Observações
            </label>
            <textarea
              id="notas"
              rows={3}
              value={r.notas}
              onChange={(e) => set("notas", e.target.value)}
              placeholder="Cliente pediu na cor da marca · imprimir com 4 paredes · a primeira saiu torta"
              className="w-full rounded-lg border border-borda-forte bg-superficie px-3.5 py-2.5 text-sm text-texto placeholder:text-texto-fraco focus:border-marca-600 focus:outline-none focus:ring-2 focus:ring-marca-600/20"
            />
          </div>
        </Secao>

        <div className="flex flex-wrap gap-3 pt-6">
          <div className="w-full sm:w-auto sm:min-w-52">
            <BotaoEnviar carregando="Salvando...">
              {id ? "Salvar alterações" : "Salvar peça"}
            </BotaoEnviar>
          </div>
          <Link
            href="/projetos"
            className="inline-flex items-center justify-center rounded-lg border border-borda-forte bg-superficie px-4 py-2.5 text-sm font-semibold text-texto hover:bg-superficie-2"
          >
            Cancelar
          </Link>
          {!pronto && (
            <p className="w-full text-xs text-texto-suave">
              Dê um nome à peça e informe o tempo de impressão para salvar.
            </p>
          )}
        </div>
      </div>

      {/* ── prévia grudada na lateral ── */}
      <aside className="mt-8 lg:sticky lg:top-6 lg:mt-0">
        <Card>
          <CardTitulo
            descricao="Atualiza enquanto você digita."
            acao={
              resultado.custoTotal > 0 ? (
                <Etiqueta tom={resultado.risco.score < 40 ? "lucro" : "atencao"}>
                  risco {resultado.risco.score}
                </Etiqueta>
              ) : undefined
            }
          >
            Preço sugerido
          </CardTitulo>

          <div className="space-y-5 px-5 py-5">
            {resultado.custoTotal <= 0 ? (
              <p className="text-sm leading-relaxed text-texto-suave">
                Assim que você lançar o filamento e o tempo de impressão, o preço aparece aqui e
                vai mudando a cada ajuste.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-texto-suave">Preço ideal</p>
                  <p className="tabular mt-1 text-3xl font-bold tracking-tight text-texto">
                    {brl(resultado.faixas.ideal.preco)}
                  </p>
                  <p className="tabular mt-1 text-xs text-texto-suave">
                    custo {brl(resultado.custoTotal)} · sobram{" "}
                    {brl(resultado.faixas.ideal.lucroLiquido)} ({pct(resultado.faixas.ideal.margemRealPct)})
                  </p>
                </div>

                {r.precoVendaAtual != null && r.precoVendaAtual > 0 && (
                  <Aviso
                    nivel={
                      r.precoVendaAtual < resultado.faixas.minimo.preco
                        ? "critico"
                        : r.precoVendaAtual < resultado.faixas.ideal.preco
                          ? "atencao"
                          : "sucesso"
                    }
                  >
                    {r.precoVendaAtual < resultado.faixas.minimo.preco ? (
                      <>
                        Você vende por {brl(r.precoVendaAtual)} — abaixo do mínimo de{" "}
                        {brl(resultado.faixas.minimo.preco)}. Cada peça vendida assim tira dinheiro
                        do seu bolso.
                      </>
                    ) : r.precoVendaAtual < resultado.faixas.ideal.preco ? (
                      <>
                        Você vende por {brl(r.precoVendaAtual)} e dá lucro, mas está{" "}
                        {brl(resultado.faixas.ideal.preco - r.precoVendaAtual)} abaixo do ideal.
                      </>
                    ) : (
                      <>Seu preço atual de {brl(r.precoVendaAtual)} está acima do ideal. Bom sinal.</>
                    )}
                  </Aviso>
                )}

                <FaixasDePreco r={resultado} />
              </>
            )}
          </div>
        </Card>

        {resultado.custoTotal > 0 && (
          <>
            <details className="mt-4">
              <summary className="cursor-pointer rounded-lg border border-borda bg-superficie px-4 py-3 text-sm font-semibold text-texto hover:bg-superficie-2">
                Ver de onde vem o custo
              </summary>
              <Card className="mt-2">
                <DetalhamentoCusto r={resultado} />
              </Card>
            </details>

            <details className="mt-2">
              <summary className="cursor-pointer rounded-lg border border-borda bg-superficie px-4 py-3 text-sm font-semibold text-texto hover:bg-superficie-2">
                Ver o cálculo de risco
              </summary>
              <Card className="mt-2">
                <PainelRisco r={resultado} />
              </Card>
            </details>

            {resultado.avisos.length > 0 && (
              <div className="mt-4">
                <Avisos r={resultado} />
              </div>
            )}
          </>
        )}
      </aside>
    </form>
  );
}
