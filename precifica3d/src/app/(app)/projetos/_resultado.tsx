import clsx from "clsx";

import { Aviso, Card, CardTitulo, Etiqueta, brl, horas, num, pct } from "@/components/ui";
import type { ResultadoPrecificacao } from "@/core/pricing/calculator";

/**
 * O resultado do cálculo.
 *
 * Serve à prévia ao vivo do formulário e à tela da peça salva — o mesmo
 * componente nos dois lugares, para o que ele vê enquanto digita ser
 * exatamente o que fica guardado.
 */

const CORES_LINHA: Record<string, string> = {
  filamento: "bg-marca-600",
  energia: "bg-amber-500",
  depreciacao: "bg-slate-500",
  manutencao: "bg-slate-400",
  acabamento: "bg-violet-500",
  arquivo: "bg-sky-500",
  maoDeObra: "bg-emerald-600",
  indireto: "bg-zinc-400",
  embalagem: "bg-orange-400",
  frete: "bg-orange-300",
  refugo: "bg-red-500",
};

const NIVEL_RISCO: Record<string, { rotulo: string; tom: "lucro" | "atencao" | "prejuizo" }> = {
  BAIXO: { rotulo: "risco baixo", tom: "lucro" },
  MEDIO: { rotulo: "risco médio", tom: "atencao" },
  ALTO: { rotulo: "risco alto", tom: "prejuizo" },
  MUITO_ALTO: { rotulo: "risco muito alto", tom: "prejuizo" },
};

export function FaixasDePreco({
  r,
  destaque = "ideal",
}: {
  r: ResultadoPrecificacao;
  destaque?: "minimo" | "ideal" | "premium";
}) {
  const faixas = [
    { chave: "minimo" as const, ...r.faixas.minimo, ajuda: "Abaixo daqui, qualquer imprevisto vira prejuízo." },
    { chave: "ideal" as const, ...r.faixas.ideal, ajuda: "O preço que paga o custo, o risco e o seu tempo." },
    { chave: "premium" as const, ...r.faixas.premium, ajuda: "Peça exclusiva, prazo curto ou cliente que valoriza." },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {faixas.map((f) => {
        const aceso = f.chave === destaque;
        return (
          <div
            key={f.chave}
            className={clsx(
              "rounded-xl border p-4",
              aceso
                ? "border-marca-600 bg-marca-50 ring-1 ring-marca-600 dark:bg-marca-950/50"
                : "border-borda bg-superficie",
            )}
          >
            <p
              className={clsx(
                "text-xs font-semibold uppercase tracking-wide",
                aceso ? "text-marca-700 dark:text-marca-300" : "text-texto-suave",
              )}
            >
              {f.rotulo}
            </p>
            <p className="tabular mt-1.5 text-2xl font-bold tracking-tight text-texto">
              {brl(f.preco)}
            </p>
            <p className="tabular mt-1 text-xs text-texto-suave">
              sobram {brl(f.lucroLiquido)} · {pct(f.margemRealPct)} do preço
            </p>
            {f.taxasEmReais > 0 && (
              <p className="tabular mt-0.5 text-xs text-texto-fraco">
                taxas levam {brl(f.taxasEmReais)}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-texto-suave">{f.ajuda}</p>
          </div>
        );
      })}
    </div>
  );
}

export function DetalhamentoCusto({ r }: { r: ResultadoPrecificacao }) {
  if (r.linhas.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-texto-suave">
        Preencha filamento, tempo de impressão e mão de obra para o custo aparecer.
      </p>
    );
  }

  return (
    <div className="px-5 py-5">
      {/* barra proporcional: mostra de relance onde o dinheiro está indo */}
      <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full bg-superficie-2">
        {r.linhas.map((l) => (
          <div
            key={l.chave}
            className={CORES_LINHA[l.chave] ?? "bg-zinc-400"}
            style={{ width: `${l.participacaoPct}%` }}
            title={`${l.rotulo}: ${brl(l.valor)} (${l.participacaoPct}%)`}
          />
        ))}
      </div>

      <ul className="space-y-3">
        {r.linhas.map((l) => (
          <li key={l.chave}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm text-texto">
                <span
                  aria-hidden
                  className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", CORES_LINHA[l.chave] ?? "bg-zinc-400")}
                />
                <span className="truncate font-medium">{l.rotulo}</span>
              </span>
              <span className="tabular shrink-0 text-sm font-semibold text-texto">
                {brl(l.valor)}
                <span className="ml-1.5 font-normal text-texto-fraco">{l.participacaoPct}%</span>
              </span>
            </div>
            {l.detalhe && (
              <p className="mt-0.5 pl-4.5 text-xs leading-relaxed text-texto-suave">{l.detalhe}</p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline justify-between border-t border-borda pt-4">
        <span className="text-sm font-semibold text-texto">Custo total da peça</span>
        <span className="tabular text-lg font-bold text-texto">{brl(r.custoTotal)}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-texto-suave">
        É quanto sai do seu bolso para essa peça existir — já incluída a reserva para quando
        uma sai errada. Não é preço de venda.
      </p>
    </div>
  );
}

export function PainelRisco({ r }: { r: ResultadoPrecificacao }) {
  const n = NIVEL_RISCO[r.risco.nivel];

  return (
    <div className="px-5 py-5">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-superficie-2">
            <div
              className={clsx(
                "h-full rounded-full",
                r.risco.score < 20
                  ? "bg-lucro"
                  : r.risco.score < 40
                    ? "bg-amber-500"
                    : r.risco.score < 65
                      ? "bg-orange-500"
                      : "bg-prejuizo",
              )}
              style={{ width: `${r.risco.score}%` }}
            />
          </div>
        </div>
        <Etiqueta tom={n.tom}>{n.rotulo}</Etiqueta>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-texto">
        {r.risco.manual ? (
          <>
            Você fixou a taxa de refugo em <strong>{pct(r.risco.taxaFalhaImpressaoPct)}</strong>.
          </>
        ) : (
          <>
            Reservei <strong>{pct(r.risco.taxaFalhaImpressaoPct)}</strong> sobre o que se perde
            numa falha de impressão e <strong>{pct(r.risco.taxaFalhaAcabamentoPct)}</strong> sobre
            o que se perde quebrando no acabamento.
          </>
        )}
      </p>

      {r.risco.fatores.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {r.risco.fatores.map((f) => (
            <li key={f} className="flex gap-2 text-xs leading-relaxed text-texto-suave">
              <span aria-hidden className="text-atencao">
                ▲
              </span>
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Produtividade({ r }: { r: ResultadoPrecificacao }) {
  return (
    <dl className="divide-y divide-borda text-sm">
      {[
        {
          rotulo: "Tempo de impressão",
          valor: horas(r.horasImpressao),
          nota: "máquina ocupada",
        },
        {
          rotulo: "Seu tempo",
          valor: horas(r.horasHumanas),
          nota: "modelagem, preparo, acabamento",
        },
        {
          rotulo: "A máquina rende",
          valor: `${brl(r.ganhoPorHoraMaquina)}/h`,
          nota: "lucro ÷ horas de impressão",
        },
        {
          rotulo: "Você ganha",
          valor: `${brl(r.ganhoPorHoraHumana)}/h`,
          nota: "lucro ÷ suas horas de trabalho",
        },
        {
          rotulo: "Taxas somadas",
          valor: pct(r.taxasTotaisPct),
          nota: "canal + pagamento + imposto",
        },
      ].map((l) => (
        <div key={l.rotulo} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
          <dt className="min-w-0">
            <span className="text-texto">{l.rotulo}</span>
            <span className="block text-xs text-texto-fraco">{l.nota}</span>
          </dt>
          <dd className="tabular shrink-0 font-semibold text-texto">{l.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Avisos({ r }: { r: ResultadoPrecificacao }) {
  if (r.avisos.length === 0) return null;
  return (
    <div className="space-y-3">
      {r.avisos.map((a, i) => (
        <Aviso key={`${a.nivel}-${i}`} nivel={a.nivel}>
          {a.texto}
        </Aviso>
      ))}
    </div>
  );
}

/** Bloco completo, usado na tela da peça. */
export function ResultadoCompleto({ r }: { r: ResultadoPrecificacao }) {
  return (
    <div className="space-y-6">
      <FaixasDePreco r={r} />
      <Avisos r={r} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitulo descricao={`${num(r.linhas.length)} itens compõem o custo.`}>
            De onde vem o custo
          </CardTitulo>
          <DetalhamentoCusto r={r} />
        </Card>
        <div className="space-y-6">
          <Card>
            <CardTitulo descricao="Quanto guardar para as que saem erradas.">
              Risco e refugo
            </CardTitulo>
            <PainelRisco r={r} />
          </Card>
          <Card>
            <CardTitulo>Vale a pena?</CardTitulo>
            <Produtividade r={r} />
          </Card>
        </div>
      </div>
    </div>
  );
}
