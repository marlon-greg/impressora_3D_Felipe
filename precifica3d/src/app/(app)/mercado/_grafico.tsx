"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Variação de uma série ao longo do tempo.
 *
 * Sem eixo Y começando em zero: aqui interessa o movimento, não a magnitude
 * absoluta — o dólar entre 5,20 e 5,60 vira uma linha reta se o eixo começar
 * do zero, e some justamente a informação que importa.
 */
export function GraficoVariacao({
  pontos,
  cor = "#0d9488",
  prefixo = "R$ ",
  casas = 2,
}: {
  pontos: { dia: string; valor: number }[];
  cor?: string;
  prefixo?: string;
  casas?: number;
}) {
  if (pontos.length < 2) {
    return (
      <p className="px-5 py-10 text-center text-sm leading-relaxed text-texto-suave">
        Ainda não há histórico suficiente para desenhar a variação. A coleta roda uma vez por
        dia — em alguns dias o gráfico aparece aqui.
      </p>
    );
  }

  const valores = pontos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const folga = (max - min) * 0.15 || max * 0.02;

  const fmt = (v: number) =>
    `${prefixo}${v.toLocaleString("pt-BR", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    })}`;

  const dia = (d: string) => {
    const [, m, x] = d.split("-");
    return `${x}/${m}`;
  };

  return (
    <div className="h-56 w-full px-2 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pontos} margin={{ top: 5, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="preenchimento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={cor} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-borda" vertical={false} />
          <XAxis
            dataKey="dia"
            tickFormatter={dia}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-texto-fraco"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[min - folga, max + folga]}
            tickFormatter={(v: number) => fmt(v)}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-texto-fraco"
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            formatter={(v) => [fmt(Number(v)), "valor"]}
            labelFormatter={(d) => `dia ${dia(String(d))}`}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--borda-forte)",
              background: "var(--superficie)",
              color: "var(--texto)",
              fontSize: 13,
            }}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke={cor}
            strokeWidth={2}
            fill="url(#preenchimento)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
