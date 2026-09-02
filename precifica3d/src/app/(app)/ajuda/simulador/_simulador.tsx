"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

import { Aviso, Card, Etiqueta, BOTAO, brl, num, pct } from "@/components/ui";
import { IconeSeta, IconeVoltar, IconeCheck } from "@/components/ui/icones";
import { precificar, type EntradaPrecificacao } from "@/core/pricing/calculator";
import { FaixasDePreco } from "@/app/(app)/projetos/_resultado";

/**
 * Simulador do manual.
 *
 * A ideia é simples: mostrar a tela antes de a pessoa chegar nela. Quem nunca
 * usou o sistema não tem medo de errar o preço — tem medo de clicar em algo
 * que não dá para desfazer. Ver o desenho da tela ao lado da explicação resolve
 * isso mais rápido que qualquer parágrafo.
 *
 * Nada aqui grava nada. As telas são desenhos inertes, MENOS o cálculo do
 * passo da peça: ali roda `precificar()`, o mesmo motor do app. Se o motor
 * mudar, o manual muda junto — manual que descreve um sistema que já não
 * existe é pior que manual nenhum.
 */

// ── peças de cenário ───────────────────────────────────────────

/** Moldura de "tela do app", com a rota escrita em cima. */
function Moldura({ rota, children }: { rota: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-borda-forte bg-superficie shadow-sm">
      <div className="flex items-center gap-2 border-b border-borda bg-superficie-2 px-3 py-2">
        <span aria-hidden className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-borda-forte" />
          <span className="h-2 w-2 rounded-full bg-borda-forte" />
          <span className="h-2 w-2 rounded-full bg-borda-forte" />
        </span>
        <span className="truncate font-mono text-[11px] text-texto-suave">{rota}</span>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

/** Campo desenhado — não recebe digitação, só mostra o formato esperado. */
function CampoFalso({
  rotulo,
  valor,
  sufixo,
  aceso,
}: {
  rotulo: string;
  valor: string;
  sufixo?: string;
  aceso?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-texto">{rotulo}</p>
      <div
        className={clsx(
          "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
          aceso
            ? "border-marca-600 ring-2 ring-marca-600/20 text-texto"
            : "border-borda-forte text-texto-suave",
        )}
      >
        <span className="truncate">{valor}</span>
        {sufixo && <span className="ml-2 shrink-0 text-xs text-texto-fraco">{sufixo}</span>}
      </div>
    </div>
  );
}

function BotaoFalso({ children, tom = "primario" }: { children: ReactNode; tom?: "primario" | "secundario" }) {
  return (
    <span
      className={clsx(
        "inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold",
        tom === "primario"
          ? "bg-marca-700 text-white"
          : "border border-borda-forte bg-superficie text-texto",
      )}
    >
      {children}
    </span>
  );
}

function LinhaFalsa({
  titulo,
  detalhe,
  direita,
}: {
  titulo: ReactNode;
  detalhe?: ReactNode;
  direita?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-borda px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-texto">{titulo}</p>
        {detalhe && <p className="truncate text-xs text-texto-suave">{detalhe}</p>}
      </div>
      {direita && <div className="shrink-0 text-right">{direita}</div>}
    </div>
  );
}

/** Controle de verdade: é o que faz o simulador simular. */
function Deslizante({
  rotulo,
  valor,
  min,
  max,
  passo = 1,
  sufixo,
  aoMudar,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  passo?: number;
  sufixo: string;
  aoMudar: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs font-medium text-texto">
        {rotulo}
        <span className="tabular text-sm font-bold text-marca-700 dark:text-marca-400">
          {num(valor, passo < 1 ? 1 : 0)} {sufixo}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="mt-2 w-full accent-marca-700"
      />
    </label>
  );
}

// ── telas interativas ──────────────────────────────────────────

/** Passo da energia: a divisão que ninguém faz, feita na frente da pessoa. */
function TelaEnergia() {
  const [conta, setConta] = useState(287);
  const [kwh, setKwh] = useState(310);
  const tarifa = kwh > 0 ? conta / kwh : 0;

  return (
    <Moldura rota="/configuracoes/energia">
      <Deslizante
        rotulo="Valor total da conta de luz"
        valor={conta}
        min={60}
        max={900}
        passo={1}
        sufixo="R$"
        aoMudar={setConta}
      />
      <Deslizante
        rotulo="Consumo do mês"
        valor={kwh}
        min={50}
        max={1200}
        passo={5}
        sufixo="kWh"
        aoMudar={setKwh}
      />
      <div className="rounded-lg bg-marca-50 px-4 py-3 dark:bg-marca-950/50">
        <p className="text-xs font-medium text-marca-800 dark:text-marca-200">
          Sua tarifa real
        </p>
        <p className="tabular mt-0.5 text-2xl font-bold text-marca-900 dark:text-marca-100">
          {brl(tarifa)} <span className="text-sm font-medium">/ kWh</span>
        </p>
        <p className="mt-1 text-xs text-marca-800 dark:text-marca-200">
          A tarifa de tabela da distribuidora costuma ficar perto de R$ 0,75. A sua sai maior
          porque a conta traz impostos, bandeira e taxa de iluminação — e é a sua que vale.
        </p>
      </div>
    </Moldura>
  );
}

/** Passo da margem: markup e margem líquida lado a lado, com o mesmo número. */
function TelaMargem() {
  const [margem, setMargem] = useState(60);
  const custo = 118.4;
  const taxas = 0.14;

  const markup = (custo * (1 + margem / 100)) / (1 - taxas);
  const liquida = margem >= 95 ? Infinity : custo / (1 - margem / 100) / (1 - taxas);

  return (
    <Moldura rota="/configuracoes/margem">
      <p className="text-xs text-texto-suave">
        Peça de exemplo, custo total de <strong className="text-texto">{brl(custo)}</strong>,
        vendida num canal que fica com 14%.
      </p>
      <Deslizante
        rotulo="Margem"
        valor={margem}
        min={10}
        max={90}
        passo={5}
        sufixo="%"
        aoMudar={setMargem}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-marca-600 bg-marca-50 p-3 dark:bg-marca-950/50">
          <p className="text-xs font-semibold text-marca-800 dark:text-marca-200">
            MARKUP (padrão)
          </p>
          <p className="tabular mt-1 text-xl font-bold text-texto">{brl(markup)}</p>
          <p className="mt-1 text-[11px] leading-snug text-texto-suave">
            custo × (1 + {margem}%) — “ponho {margem}% em cima”
          </p>
        </div>
        <div className="rounded-lg border border-borda p-3">
          <p className="text-xs font-semibold text-texto-suave">MARGEM LÍQUIDA</p>
          <p className="tabular mt-1 text-xl font-bold text-texto">
            {Number.isFinite(liquida) ? brl(liquida) : "—"}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-texto-suave">
            custo ÷ (1 − {margem}%) — “{margem}% do preço é meu”
          </p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-texto-suave">
        Mesmo percentual, preços diferentes. Escolha um modo e fique nele — trocar no meio do
        catálogo é o que faz duas peças parecidas terem lógicas de preço diferentes.
      </p>
    </Moldura>
  );
}

/** Passo da peça: o motor de verdade, com os números do ateliê. */
function TelaPeca() {
  const [gramas, setGramas] = useState(85);
  const [horasImpressao, setHorasImpressao] = useState(4.5);
  const [horasTrabalho, setHorasTrabalho] = useState(0.75);
  const [suporte, setSuporte] = useState(true);
  const [multiCor, setMultiCor] = useState(false);

  const resultado = useMemo(() => {
    const entrada: EntradaPrecificacao = {
      impressora: {
        nome: "Kobra X",
        valorPago: 2200,
        vidaUtilHoras: 6000,
        manutencaoAnual: 300,
        horasUsoAnual: 900,
        potenciaWatts: 180,
      },
      tarifaKwh: 0.93,
      horasImpressao,
      custoArquivo: 0,
      filamentos: [
        {
          materialId: "exemplo-petg",
          nome: "PETG preto",
          gramas,
          desperdicioPct: 5,
          precoEmbalagem: 109.9,
          tamanhoEmbalagem: 1000,
        },
      ],
      materiais: [],
      trabalhos: [
        { descricao: "Preparo do arquivo", horas: 0.25, valorHora: 45, antesDaImpressao: true },
        { descricao: "Acabamento e montagem", horas: horasTrabalho, valorHora: 35 },
      ],
      complexidade: {
        precisaSuporte: suporte,
        paredesFinas: false,
        pecasMoveis: false,
        multiCor,
        encaixePreciso: false,
        impressaoAlta: false,
        numeroPecas: 1,
        horasImpressao,
        maiorDimensaoMm: 120,
        refugoManualPct: null,
      },
      comercial: {
        modoMargem: "MARKUP",
        margemPct: 60,
        taxaCanalPct: 14,
        taxaPagamentoPct: 0,
        impostoPct: 0,
        embalagemCusto: 3.5,
        freteEmbutido: 0,
      },
      custoIndiretoMensal: 80,
      horasProdutivasMes: 60,
    };
    return precificar(entrada);
  }, [gramas, horasImpressao, horasTrabalho, suporte, multiCor]);

  return (
    <Moldura rota="/projetos/novo">
      <div className="grid gap-3 sm:grid-cols-2">
        <Deslizante
          rotulo="Filamento"
          valor={gramas}
          min={5}
          max={600}
          passo={5}
          sufixo="g"
          aoMudar={setGramas}
        />
        <Deslizante
          rotulo="Tempo de impressão"
          valor={horasImpressao}
          min={0.5}
          max={30}
          passo={0.5}
          sufixo="h"
          aoMudar={setHorasImpressao}
        />
        <Deslizante
          rotulo="Seu trabalho (acabamento)"
          valor={horasTrabalho}
          min={0}
          max={6}
          passo={0.25}
          sufixo="h"
          aoMudar={setHorasTrabalho}
        />
        <div className="flex flex-wrap items-end gap-2 pb-1">
          <button
            type="button"
            onClick={() => setSuporte((v) => !v)}
            aria-pressed={suporte}
            className={clsx(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              suporte
                ? "border-marca-600 bg-marca-700 text-white"
                : "border-borda-forte text-texto-suave",
            )}
          >
            precisa de suporte
          </button>
          <button
            type="button"
            onClick={() => setMultiCor((v) => !v)}
            aria-pressed={multiCor}
            className={clsx(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              multiCor
                ? "border-marca-600 bg-marca-700 text-white"
                : "border-borda-forte text-texto-suave",
            )}
          >
            troca de cor
          </button>
        </div>
      </div>

      <FaixasDePreco r={resultado} />

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-borda px-3 py-2">
          <p className="text-[11px] text-texto-suave">Custo total</p>
          <p className="tabular text-sm font-bold text-texto">{brl(resultado.custoTotal)}</p>
        </div>
        <div className="rounded-lg border border-borda px-3 py-2">
          <p className="text-[11px] text-texto-suave">Reserva de refugo</p>
          <p className="tabular text-sm font-bold text-texto">
            {brl(resultado.reservaRefugo)}{" "}
            <span className="text-[11px] font-medium text-texto-suave">
              ({pct(resultado.risco.taxaFalhaImpressaoPct)})
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-borda px-3 py-2">
          <p className="text-[11px] text-texto-suave">Sua hora rende</p>
          <p className="tabular text-sm font-bold text-texto">
            {brl(resultado.ganhoPorHoraHumana)}
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-texto-suave">
        Arraste o trabalho de acabamento para 3 h e olhe o preço ideal. Não é o sistema
        encarecendo a peça — é o custo que já existia e ninguém estava cobrando.
      </p>
    </Moldura>
  );
}

// ── os passos ──────────────────────────────────────────────────

interface Passo {
  titulo: string;
  onde: string;
  objetivo: string;
  acoes: ReactNode[];
  dica?: { nivel: "info" | "atencao"; titulo: string; texto: ReactNode };
  link?: { href: string; rotulo: string };
  Tela: () => ReactNode;
}

const PASSOS: Passo[] = [
  {
    titulo: "Abrir o convite e entrar",
    onde: "E-mail → tela de entrada",
    objetivo:
      "Sua conta começa por um convite, não por uma senha que alguém te passou. Assim ninguém — nem quem administra — conhece a sua senha.",
    acoes: [
      "Procure o e-mail “Você foi convidado para o Precifica3D”. Se não estiver na caixa de entrada, olhe em spam e promoções.",
      "Clique no botão do e-mail. Ele abre a tela de criar senha já com o seu endereço preenchido.",
      "Se o link disser que expirou, use “Esqueci minha senha” na tela de entrada — chega um novo em segundos.",
    ],
    Tela: () => (
      <Moldura rota="/entrar">
        <p className="text-sm font-semibold text-texto">Entrar</p>
        <CampoFalso rotulo="E-mail" valor="felipe@seuemail.com.br" aceso />
        <CampoFalso rotulo="Senha" valor="••••••••••••" />
        <BotaoFalso>Entrar</BotaoFalso>
        <p className="text-center text-xs text-texto-suave underline">Esqueci minha senha</p>
      </Moldura>
    ),
  },

  {
    titulo: "Criar a sua senha",
    onde: "Definir senha",
    objetivo:
      "É o único momento em que a senha é escolhida. Ela é sua e o sistema guarda apenas um resumo embaralhado dela — nem o banco de dados sabe qual é.",
    acoes: [
      "Escolha uma senha de 10 caracteres ou mais. Uma frase curta que só você diria funciona melhor que letra trocada por número.",
      "Se o sistema recusar dizendo que a senha já vazou, troque: ela está em listas públicas que qualquer um baixa.",
      "Ao confirmar, você entra direto no Painel. Não precisa fazer login de novo.",
    ],
    dica: {
      nivel: "atencao",
      titulo: "Se te deram uma senha provisória",
      texto: (
        <>
          O sistema obriga a trocar antes de mostrar qualquer tela. Não dá para pular, e é de
          propósito: senha que outra pessoa conhece não é senha.
        </>
      ),
    },
    Tela: () => (
      <Moldura rota="/definir-senha">
        <p className="text-sm font-semibold text-texto">Defina sua senha</p>
        <p className="text-xs text-texto-suave">Conta de felipe@seuemail.com.br</p>
        <CampoFalso rotulo="Nova senha" valor="••••••••••••••" aceso />
        <div className="flex gap-1">
          <span className="h-1.5 flex-1 rounded-full bg-lucro" />
          <span className="h-1.5 flex-1 rounded-full bg-lucro" />
          <span className="h-1.5 flex-1 rounded-full bg-lucro" />
          <span className="h-1.5 flex-1 rounded-full bg-superficie-2" />
        </div>
        <p className="text-xs text-lucro">Senha forte</p>
        <CampoFalso rotulo="Repita a senha" valor="••••••••••••••" />
        <BotaoFalso>Criar senha e entrar</BotaoFalso>
      </Moldura>
    ),
  },

  {
    titulo: "Reconhecer o Painel",
    onde: "Painel",
    objetivo:
      "É a primeira tela depois do login e o resumo do ateliê. Na primeira semana ela vai estar cheia de pendências — isso é o roteiro, não um defeito.",
    acoes: [
      "As pendências no topo listam o que ainda atrapalha o cálculo: preço estimado, conta de luz faltando, valor/hora não definido.",
      "Estoque baixo avisa antes de acabar, com base no mínimo que você definiu em cada material.",
      "Peças recentes e últimas movimentações mostram o que aconteceu por último, com quem fez.",
    ],
    link: { href: "/painel", rotulo: "Abrir o Painel" },
    Tela: () => (
      <Moldura rota="/painel">
        <p className="text-sm font-semibold text-texto">Boa tarde, Felipe</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Peças", "12"],
            ["Materiais", "28"],
            ["Ticket médio", "R$ 214"],
          ].map(([r, v]) => (
            <div key={r} className="rounded-lg border border-borda px-3 py-2">
              <p className="text-[11px] text-texto-suave">{r}</p>
              <p className="tabular text-base font-bold text-texto">{v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-r-lg border-l-4 border-l-atencao bg-atencao-suave px-3 py-2">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
            3 pendências atrapalham o cálculo
          </p>
          <p className="mt-0.5 text-[11px] text-amber-900 dark:text-amber-100">
            28 materiais com preço estimado · conta de luz não informada · valor/hora vazio
          </p>
        </div>
        <LinhaFalsa
          titulo="PETG preto — Masterprint"
          detalhe="estoque 0,4 kg · mínimo 1 kg"
          direita={<Etiqueta tom="atencao">baixo</Etiqueta>}
        />
      </Moldura>
    ),
  },

  {
    titulo: "Conferir a impressora",
    onde: "Ajustes → Impressoras",
    objetivo:
      "A máquina se paga a cada hora impressa. Sem esses números o sistema não sabe quanto de depreciação e de energia entra em cada peça.",
    acoes: [
      "Valor pago: o que saiu do bolso, com frete, não o preço de tabela.",
      "Potência em watts: está na etiqueta da fonte. Uma FDM com mesa aquecida gira em 150–250 W.",
      "Vida útil e horas por ano: dá para estimar. 6.000 horas de vida e 900 horas por ano são pontos de partida razoáveis.",
      "Enquanto um campo estiver marcado como estimado, ele aparece com o selo roxo na tela.",
    ],
    link: { href: "/configuracoes/impressoras", rotulo: "Abrir Impressoras" },
    Tela: () => (
      <Moldura rota="/configuracoes/impressoras">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-texto">Kobra X</p>
          <Etiqueta tom="estimado">estimado</Etiqueta>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CampoFalso rotulo="Valor pago" valor="2.200,00" sufixo="R$" aceso />
          <CampoFalso rotulo="Potência" valor="180" sufixo="W" />
          <CampoFalso rotulo="Vida útil" valor="6.000" sufixo="h" />
          <CampoFalso rotulo="Uso por ano" valor="900" sufixo="h" />
        </div>
        <p className="text-[11px] leading-snug text-texto-suave">
          Cada hora de impressão custa R$ 0,70 de depreciação e manutenção — some isso em 900
          horas por ano e a máquina se paga sem você perceber.
        </p>
        <BotaoFalso>Salvar</BotaoFalso>
      </Moldura>
    ),
  },

  {
    titulo: "Lançar a conta de luz",
    onde: "Ajustes → Energia",
    objetivo:
      "A tarifa de tabela mente. O R$/kWh real vem da divisão de duas linhas da sua própria conta — arraste os controles ao lado e veja.",
    acoes: [
      "Pegue a última conta e informe o valor total pago e o consumo do mês em kWh.",
      "O sistema divide um pelo outro. O resultado já inclui impostos, bandeira e taxa de iluminação.",
      "Refaça isso quando a bandeira mudar de cor por vários meses seguidos.",
    ],
    link: { href: "/configuracoes/energia", rotulo: "Abrir Energia" },
    Tela: TelaEnergia,
  },

  {
    titulo: "Dizer quanto vale a sua hora",
    onde: "Ajustes → Mão de obra",
    objetivo:
      "É o passo que a maioria pula, e o que mais muda o preço. Enquanto sua hora valer zero, cada peça vendida é uma hora doada.",
    acoes: [
      "Cadastre um valor por tipo de trabalho: modelar vale mais que lixar.",
      "Sem ideia de por onde começar? Pense em quanto você gostaria de tirar por mês e divida pelas horas que consegue trabalhar de verdade.",
      "Na peça, marque o que é feito antes da impressão: esse tempo não se perde quando a peça falha, e o cálculo do refugo leva isso em conta.",
    ],
    link: { href: "/configuracoes/mao-de-obra", rotulo: "Abrir Mão de obra" },
    Tela: () => (
      <Moldura rota="/configuracoes/mao-de-obra">
        <p className="text-sm font-semibold text-texto">Quanto vale cada hora sua</p>
        <LinhaFalsa titulo="Modelagem 3D" direita={<span className="tabular text-sm font-bold text-texto">R$ 60,00</span>} />
        <LinhaFalsa titulo="Preparo e fatiamento" direita={<span className="tabular text-sm font-bold text-texto">R$ 45,00</span>} />
        <LinhaFalsa titulo="Pintura e acabamento" direita={<span className="tabular text-sm font-bold text-texto">R$ 35,00</span>} />
        <LinhaFalsa titulo="Montagem" direita={<span className="tabular text-sm font-bold text-texto">R$ 30,00</span>} />
        <p className="text-[11px] leading-snug text-texto-suave">
          Quer tirar R$ 3.000 por mês trabalhando 20 horas por semana? São ~80 horas: R$ 37,50 a
          hora, antes de qualquer custo.
        </p>
      </Moldura>
    ),
  },

  {
    titulo: "Escolher margem e taxas",
    onde: "Ajustes → Margem",
    objetivo:
      "Markup e margem líquida se chamam “margem” e dão preços bem diferentes com o mesmo percentual. Mexa no controle ao lado até a diferença ficar óbvia.",
    acoes: [
      "Markup: você põe X% em cima do custo. É como o vendedor pensa, e é o padrão do sistema.",
      "Margem líquida: X% do preço final é lucro. É como o contador pensa.",
      "Informe também a taxa do canal e a da maquininha. Elas não se somam à margem — saem por cima do preço.",
      "Custo indireto mensal e horas produtivas do mês: internet, aluguel, assinaturas, diluídos por hora.",
    ],
    link: { href: "/configuracoes/margem", rotulo: "Abrir Margem" },
    Tela: TelaMargem,
  },

  {
    titulo: "Corrigir o preço dos materiais",
    onde: "Materiais",
    objetivo:
      "Todo material criado pelo sistema nasce com preço de mercado e o selo “estimado”. Trocar pelos seus preços reais é o que faz o cálculo virar verdade.",
    acoes: [
      "Abra o material e informe o preço da embalagem cheia e o tamanho dela — o rolo de 1000 g, o pote de 37 ml.",
      "Para itens que não se dividem, como pincel e lixa, informe quantas peças o item rende. O custo entra rateado.",
      "Informe o estoque atual e o mínimo. É o mínimo que faz o painel avisar antes de acabar.",
      "Ao repor, lance como reposição com o preço pago: o histórico de preço se monta sozinho.",
    ],
    link: { href: "/materiais", rotulo: "Abrir Materiais" },
    Tela: () => (
      <Moldura rota="/materiais">
        <p className="text-sm font-semibold text-texto">Filamento</p>
        <LinhaFalsa
          titulo="PETG preto — Masterprint"
          detalhe="1 kg · R$ 109,90 → R$ 0,110 por grama"
          direita={<Etiqueta tom="estimado">estimado</Etiqueta>}
        />
        <LinhaFalsa
          titulo="PETG rosa — Masterprint"
          detalhe="1 kg · R$ 118,00 → R$ 0,118 por grama"
          direita={<Etiqueta tom="lucro">seu preço</Etiqueta>}
        />
        <p className="text-sm font-semibold text-texto">Tinta</p>
        <LinhaFalsa
          titulo="Acrílica preta — Acrilex"
          detalhe="37 ml · R$ 7,50"
          direita={<Etiqueta tom="estimado">estimado</Etiqueta>}
        />
        <p className="text-[11px] leading-snug text-texto-suave">
          Corrigir um preço aqui muda o preço de todas as peças que usam este material — e o
          sistema avisa quais ficaram defasadas.
        </p>
      </Moldura>
    ),
  },

  {
    titulo: "Cadastrar a primeira peça",
    onde: "Projetos → Nova peça",
    objetivo:
      "Aqui o preço muda enquanto você digita — não existe botão “calcular”. Os controles ao lado rodam o motor de verdade: mexa e veja o que move o preço.",
    acoes: [
      "Gramas e tempo de impressão saem do fatiador, sem arredondar para baixo.",
      "Lance o seu trabalho em horas. É quase sempre a maior linha do custo.",
      "Marque a complexidade: suporte, paredes finas, peças móveis, troca de cor. Cada marca aumenta a reserva de refugo, e o sistema mostra quais fatores pesaram.",
      "Anuncie pela faixa ideal. A mínima é piso de negociação, não tabela.",
    ],
    dica: {
      nivel: "info",
      titulo: "Olhe o “sua hora rende”",
      texto: (
        <>
          É o número mais honesto da tela. Uma peça pode parecer lucrativa e render R$ 6 por hora
          do seu trabalho — aí não é o preço que está errado, é a peça que não vale a pena.
        </>
      ),
    },
    link: { href: "/projetos/novo", rotulo: "Cadastrar uma peça de verdade" },
    Tela: TelaPeca,
  },

  {
    titulo: "Produzir, fotografar e anunciar",
    onde: "Peça → Fotos e “produzi esta peça”",
    objetivo:
      "Fechado o preço, o resto é rotina: imprimiu, dá baixa; fotografou, sobe; anunciou, muda o status.",
    acoes: [
      "“Produzi esta peça” dá baixa no estoque de tudo que ela usa, na quantidade certa, de uma vez.",
      "Suba as fotos em duas galerias: venda (a bonita, do anúncio) e fabricação (o setup, o erro — sua memória técnica).",
      "No computador, Ctrl+V cola direto a foto da área de transferência. Escolha a capa do anúncio.",
      "Mude o status para anunciado. Se o filamento subir depois, a peça avisa que o seu anúncio ficou defasado.",
    ],
    link: { href: "/projetos", rotulo: "Ver as peças" },
    Tela: () => (
      <Moldura rota="/projetos/suporte-de-fone">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-texto">Suporte de fone</p>
          <Etiqueta tom="marca">anunciado</Etiqueta>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["venda 1", "venda 2", "fabricação"].map((r) => (
            <div
              key={r}
              className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-borda-forte text-[10px] text-texto-suave"
            >
              {r}
            </div>
          ))}
        </div>
        <div className="rounded-r-lg border-l-4 border-l-atencao bg-atencao-suave px-3 py-2">
          <p className="text-[11px] text-amber-900 dark:text-amber-100">
            O PETG subiu 8% desde que esta peça foi criada. O preço ideal hoje seria R$ 289 — seu
            anúncio está em R$ 272.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <BotaoFalso tom="secundario">Enviar fotos</BotaoFalso>
          <BotaoFalso>Produzi esta peça</BotaoFalso>
        </div>
      </Moldura>
    ),
  },
];

// ── o simulador ────────────────────────────────────────────────

export function Simulador() {
  const [i, setI] = useState(0);
  const p = PASSOS[i];
  const ultimo = i === PASSOS.length - 1;

  function ir(destino: number) {
    setI(destino);
    // no celular a tela do passo fica embaixo do texto; sem isto a pessoa
    // avança e continua olhando o fim do passo anterior
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      {/* progresso */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold text-texto-suave">
            Passo {i + 1} de {PASSOS.length}
          </p>
          <p className="text-xs text-texto-suave">{Math.round(((i + 1) / PASSOS.length) * 100)}%</p>
        </div>
        <div className="mt-2 flex gap-1">
          {PASSOS.map((passo, n) => (
            <button
              key={passo.titulo}
              type="button"
              onClick={() => ir(n)}
              title={`${n + 1}. ${passo.titulo}`}
              aria-label={`Ir para o passo ${n + 1}: ${passo.titulo}`}
              aria-current={n === i ? "step" : undefined}
              className={clsx(
                "h-1.5 flex-1 rounded-full transition-colors",
                n < i && "bg-marca-400",
                n === i && "bg-marca-700",
                n > i && "bg-superficie-2 hover:bg-borda-forte",
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* ── explicação ── */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-marca-700 dark:text-marca-400">
              {p.onde}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-texto">{p.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed text-texto-suave">{p.objetivo}</p>
          </div>

          <Card className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-texto-suave">
              O que fazer
            </p>
            <ul className="space-y-2.5">
              {p.acoes.map((acao, n) => (
                <li key={n} className="flex gap-2.5 text-sm leading-relaxed text-texto-suave">
                  <IconeCheck
                    width={16}
                    height={16}
                    className="mt-0.5 shrink-0 text-marca-600 dark:text-marca-400"
                  />
                  <span>{acao}</span>
                </li>
              ))}
            </ul>
          </Card>

          {p.dica && (
            <Aviso nivel={p.dica.nivel} titulo={p.dica.titulo}>
              {p.dica.texto}
            </Aviso>
          )}

          {p.link && (
            <Link href={p.link.href} className={BOTAO.secundario}>
              {p.link.rotulo}
              <IconeSeta width={16} height={16} />
            </Link>
          )}
        </div>

        {/* ── a tela ── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p.Tela />
          <p className="mt-2 text-center text-[11px] text-texto-suave">
            Desenho da tela — nada aqui é gravado no seu ateliê.
          </p>
        </div>
      </div>

      {/* navegação */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-borda pt-6">
        <button
          type="button"
          onClick={() => ir(i - 1)}
          disabled={i === 0}
          className={BOTAO.secundario}
        >
          <IconeVoltar width={16} height={16} />
          Anterior
        </button>

        {ultimo ? (
          <Link href="/ajuda" className={`${BOTAO.primario} ml-auto`}>
            Terminei — ver o manual
            <IconeSeta width={16} height={16} />
          </Link>
        ) : (
          <button type="button" onClick={() => ir(i + 1)} className={`${BOTAO.primario} ml-auto`}>
            Próximo passo
            <IconeSeta width={16} height={16} />
          </button>
        )}
      </div>
    </div>
  );
}
