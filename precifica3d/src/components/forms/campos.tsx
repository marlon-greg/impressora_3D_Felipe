"use client";

import { useId, useState, useMemo, type ReactNode, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";
import { avaliarSenha, SENHA_MIN } from "@/core/validation/password";

/**
 * Campos de formulário.
 *
 * A validação daqui é conforto: mostra o problema enquanto a pessoa digita.
 * Quem decide é sempre o servidor — este arquivo roda no navegador e pode
 * ser contornado por qualquer um com o DevTools aberto.
 */

const BASE_INPUT =
  "w-full rounded-lg border bg-superficie px-3.5 py-2.5 text-sm text-texto " +
  "placeholder:text-texto-fraco transition-colors " +
  "focus:border-marca-600 focus:outline-none focus:ring-2 focus:ring-marca-600/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Campo({
  rotulo,
  erro,
  dica,
  obrigatorio,
  sufixo,
  className,
  ...props
}: {
  rotulo: string;
  erro?: string;
  dica?: ReactNode;
  obrigatorio?: boolean;
  sufixo?: ReactNode;
} & ComponentProps<"input">) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idDica = `${id}-dica`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-texto">
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-prejuizo">*</span>}
      </label>

      <div className="relative">
        <input
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={clsx(erro && idErro, dica && idDica) || undefined}
          className={clsx(
            BASE_INPUT,
            sufixo && "pr-12",
            erro ? "border-prejuizo" : "border-borda-forte",
          )}
          {...props}
        />
        {sufixo && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-texto-suave">
            {sufixo}
          </span>
        )}
      </div>

      {erro && (
        <p id={idErro} role="alert" className="mt-1.5 text-xs font-medium text-prejuizo">
          {erro}
        </p>
      )}
      {dica && !erro && (
        <p id={idDica} className="mt-1.5 text-xs text-texto-suave">
          {dica}
        </p>
      )}
    </div>
  );
}

type ExtrasCampo = {
  erro?: string;
  dica?: ReactNode;
  obrigatorio?: boolean;
};

export function CampoNumero({
  rotulo,
  unidade,
  ...props
}: { rotulo: string; unidade?: string } & ExtrasCampo & ComponentProps<"input">) {
  return (
    <Campo
      rotulo={rotulo}
      type="number"
      inputMode="decimal"
      step="any"
      sufixo={unidade}
      className="tabular"
      {...props}
    />
  );
}

export function Selecao({
  rotulo,
  erro,
  dica,
  obrigatorio,
  children,
  className,
  ...props
}: {
  rotulo: string;
  erro?: string;
  dica?: ReactNode;
  obrigatorio?: boolean;
  children: ReactNode;
} & ComponentProps<"select">) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-texto">
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-prejuizo">*</span>}
      </label>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        className={clsx(BASE_INPUT, erro ? "border-prejuizo" : "border-borda-forte")}
        {...props}
      >
        {children}
      </select>
      {erro && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-prejuizo">
          {erro}
        </p>
      )}
      {dica && !erro && <p className="mt-1.5 text-xs text-texto-suave">{dica}</p>}
    </div>
  );
}

export function Marcador({
  rotulo,
  descricao,
  ...props
}: { rotulo: string; descricao?: string } & ComponentProps<"input">) {
  const id = useId();
  return (
    // alvo grande: ele marca isso no celular, muitas vezes com a mão ocupada
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-borda bg-superficie p-3 transition-colors hover:bg-superficie-2 has-checked:border-marca-600 has-checked:bg-marca-50 dark:has-checked:bg-marca-950/40"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-borda-forte text-marca-700 focus:ring-marca-600"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-texto">{rotulo}</span>
        {descricao && (
          <span className="mt-0.5 block text-xs leading-relaxed text-texto-suave">
            {descricao}
          </span>
        )}
      </span>
    </label>
  );
}

// ── Senha com medidor de força ─────────────────────────────────

const CORES_FORCA = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-600",
];

export function CampoSenha({
  rotulo,
  erro,
  medidor = false,
  contexto = [],
  nome = "senha",
  autoComplete = "current-password",
  obrigatorio,
}: {
  rotulo: string;
  erro?: string;
  /** liga a barra de força — use só onde a pessoa está CRIANDO senha */
  medidor?: boolean;
  /** nome e e-mail: a senha não pode conter nenhum dos dois */
  contexto?: string[];
  nome?: string;
  autoComplete?: string;
  obrigatorio?: boolean;
}) {
  const id = useId();
  const [valor, setValor] = useState("");
  const [visivel, setVisivel] = useState(false);

  const forca = useMemo(
    () => (medidor && valor ? avaliarSenha(valor, contexto) : null),
    [medidor, valor, contexto],
  );

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-texto">
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-prejuizo">*</span>}
      </label>

      <div className="relative">
        <input
          id={id}
          name={nome}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={forca ? `${id}-forca` : undefined}
          className={clsx(BASE_INPUT, "pr-16", erro ? "border-prejuizo" : "border-borda-forte")}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-texto-suave hover:text-texto"
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        >
          {visivel ? "ocultar" : "mostrar"}
        </button>
      </div>

      {erro && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-prejuizo">
          {erro}
        </p>
      )}

      {medidor && (
        <div id={`${id}-forca`} className="mt-2.5" aria-live="polite">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={clsx(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  forca && i <= forca.score ? CORES_FORCA[forca.score] : "bg-superficie-2",
                )}
              />
            ))}
          </div>

          {forca ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-texto">
                Força: <span className={forca.valida ? "text-lucro" : "text-atencao"}>{forca.rotulo}</span>
              </p>
              {forca.erros.map((e) => (
                <p key={e} className="flex gap-1.5 text-xs text-prejuizo">
                  <span aria-hidden>✕</span>
                  {e}
                </p>
              ))}
              {forca.valida &&
                forca.dicas.map((d) => (
                  <p key={d} className="flex gap-1.5 text-xs text-texto-suave">
                    <span aria-hidden>·</span>
                    {d}
                  </p>
                ))}
              {forca.valida && forca.erros.length === 0 && (
                <p className="flex gap-1.5 text-xs text-lucro">
                  <span aria-hidden>✓</span>
                  Senha aceita. Ainda vamos conferir se ela aparece em vazamentos conhecidos.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-texto-suave">
              Mínimo de {SENHA_MIN} caracteres, misturando maiúscula, minúscula, número e símbolo.
              Uma frase longa vale mais que uma senha curta e complicada.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Botão de envio com estado de carregamento ──────────────────

export function BotaoEnviar({
  children,
  carregando,
  className,
  variante = "primario",
}: {
  children: ReactNode;
  /** texto exibido enquanto envia */
  carregando?: string;
  className?: string;
  variante?: "primario" | "secundario";
}) {
  const { pending } = useFormStatus();

  const estilo =
    variante === "primario"
      ? "bg-marca-700 text-white hover:bg-marca-800 active:bg-marca-900"
      : "border border-borda-forte bg-superficie text-texto hover:bg-superficie-2";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={clsx(
        "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        estilo,
        className,
      )}
    >
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {pending ? (carregando ?? "Enviando...") : children}
    </button>
  );
}
