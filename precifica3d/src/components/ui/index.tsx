import clsx from "clsx";
import type { ReactNode, ComponentProps } from "react";

/**
 * Componentes de interface compartilhados.
 *
 * Todos são Server Components por padrão — só o que precisa de interação
 * recebe "use client" no próprio arquivo, para o bundle enviado ao celular
 * dele continuar pequeno.
 */

// ── Formatação ─────────────────────────────────────────────────

export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const pct = (v: number, casas = 1) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

export const num = (v: number, casas = 0) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** "2 h 30 min" lê melhor que "2.5 h" para quem cronometra na bancada. */
export function horas(h: number): string {
  if (h === 0) return "—";
  const inteiras = Math.floor(h);
  const minutos = Math.round((h - inteiras) * 60);
  if (inteiras === 0) return `${minutos} min`;
  if (minutos === 0) return `${inteiras} h`;
  return `${inteiras} h ${minutos} min`;
}

export function quantidade(valor: number, unidade: "G" | "ML" | "UN"): string {
  if (unidade === "UN") return `${num(valor, valor % 1 === 0 ? 0 : 1)} un`;
  if (unidade === "G") return valor >= 1000 ? `${num(valor / 1000, 2)} kg` : `${num(valor, 0)} g`;
  return valor >= 1000 ? `${num(valor / 1000, 2)} L` : `${num(valor, 0)} ml`;
}

export function tempoRelativo(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  const seg = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seg < 60) return "agora";
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
  return d.toLocaleDateString("pt-BR");
}

// ── Cartão ─────────────────────────────────────────────────────

export function Card({
  children,
  className,
  ...resto
}: { children: ReactNode } & ComponentProps<"div">) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-borda bg-superficie shadow-sm",
        className,
      )}
      {...resto}
    >
      {children}
    </div>
  );
}

export function CardTitulo({
  children,
  acao,
  descricao,
}: {
  children: ReactNode;
  acao?: ReactNode;
  descricao?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-borda px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-texto">{children}</h2>
        {descricao && <p className="mt-1 text-xs text-texto-suave">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}

// ── Etiquetas ──────────────────────────────────────────────────

const TONS = {
  neutro: "bg-superficie-2 text-texto-suave border-borda",
  marca: "bg-marca-50 text-marca-800 border-marca-200 dark:bg-marca-950 dark:text-marca-200 dark:border-marca-800",
  lucro: "bg-lucro-suave text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  prejuizo: "bg-prejuizo-suave text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
  atencao: "bg-atencao-suave text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  estimado: "bg-estimado-suave text-violet-900 border-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-800",
} as const;

export type Tom = keyof typeof TONS;

export function Etiqueta({
  children,
  tom = "neutro",
  titulo,
}: {
  children: ReactNode;
  tom?: Tom;
  titulo?: string;
}) {
  return (
    <span
      title={titulo}
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONS[tom],
      )}
    >
      {children}
    </span>
  );
}

/**
 * Marca um número que veio de estimativa, não da nota fiscal.
 * Aparece em tudo que o seed chutou — some quando o Felipe corrige.
 */
export function SeloEstimado({ campo }: { campo?: string }) {
  return (
    <Etiqueta
      tom="estimado"
      titulo={
        campo
          ? `"${campo}" é uma estimativa de mercado, não o valor real. Corrija para o cálculo ficar confiável.`
          : "Valor estimado — confira com a nota fiscal."
      }
    >
      estimado
    </Etiqueta>
  );
}

// ── Avisos ─────────────────────────────────────────────────────

export function Aviso({
  nivel = "info",
  titulo,
  children,
}: {
  nivel?: "info" | "atencao" | "critico" | "sucesso";
  titulo?: string;
  children: ReactNode;
}) {
  const estilos = {
    info: "border-l-marca-600 bg-marca-50 text-marca-900 dark:bg-marca-950/50 dark:text-marca-100",
    atencao: "border-l-atencao bg-atencao-suave text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
    critico: "border-l-prejuizo bg-prejuizo-suave text-red-900 dark:bg-red-950/50 dark:text-red-100",
    sucesso: "border-l-lucro bg-lucro-suave text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
  } as const;

  return (
    <div className={clsx("rounded-r-lg border-l-4 px-4 py-3 text-sm", estilos[nivel])}>
      {titulo && <p className="mb-1 font-semibold">{titulo}</p>}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

// ── Estado vazio ───────────────────────────────────────────────

export function Vazio({
  icone,
  titulo,
  children,
  acao,
}: {
  icone?: ReactNode;
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icone && <div className="mb-3 text-3xl opacity-40">{icone}</div>}
      <p className="text-sm font-semibold text-texto">{titulo}</p>
      {children && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-texto-suave">{children}</p>
      )}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

// ── Métrica ────────────────────────────────────────────────────

export function Metrica({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  dica,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: "neutro" | "lucro" | "prejuizo" | "atencao";
  dica?: string;
}) {
  const cor = {
    neutro: "text-texto",
    lucro: "text-lucro",
    prejuizo: "text-prejuizo",
    atencao: "text-atencao",
  }[tom];

  return (
    <div title={dica}>
      <p className="text-xs font-medium text-texto-suave">{rotulo}</p>
      <p className={clsx("tabular mt-1 text-2xl font-bold tracking-tight", cor)}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-texto-suave">{detalhe}</p>}
    </div>
  );
}

// ── Barra proporcional (evita instalar lib de gráfico p/ o simples) ──

export function BarraProporcao({
  partes,
}: {
  partes: { rotulo: string; valor: number; cor: string }[];
}) {
  const total = partes.reduce((s, p) => s + p.valor, 0);
  if (total <= 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-superficie-2">
        {partes.map((p) => (
          <div
            key={p.rotulo}
            className={p.cor}
            style={{ width: `${(p.valor / total) * 100}%` }}
            title={`${p.rotulo}: ${brl(p.valor)} (${Math.round((p.valor / total) * 100)}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {partes.map((p) => (
          <span key={p.rotulo} className="flex items-center gap-1.5 text-xs text-texto-suave">
            <span className={clsx("h-2 w-2 rounded-full", p.cor)} />
            {p.rotulo}
            <span className="tabular font-medium text-texto">
              {Math.round((p.valor / total) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Botão (server-safe: é <a> ou <button> sem estado) ──────────

const BOTAO_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const BOTAO = {
  primario: clsx(
    BOTAO_BASE,
    "bg-marca-700 px-4 py-2.5 text-white hover:bg-marca-800 active:bg-marca-900",
  ),
  secundario: clsx(
    BOTAO_BASE,
    "border border-borda-forte bg-superficie px-4 py-2.5 text-texto hover:bg-superficie-2",
  ),
  perigo: clsx(BOTAO_BASE, "bg-prejuizo px-4 py-2.5 text-white hover:bg-red-700"),
  discreto: clsx(BOTAO_BASE, "px-3 py-2 text-texto-suave hover:bg-superficie-2 hover:text-texto"),
} as const;

// ── Tabela ─────────────────────────────────────────────────────

export function Tabela({ children }: { children: ReactNode }) {
  // wrapper com scroll próprio: tabela larga não pode empurrar a página no celular
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export const Th = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <th
    className={clsx(
      "border-b border-borda px-4 py-2.5 text-left text-xs font-semibold text-texto-suave",
      className,
    )}
  >
    {children}
  </th>
);

export const Td = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <td className={clsx("border-b border-borda px-4 py-3 text-texto", className)}>{children}</td>
);
