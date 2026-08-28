import type { Metadata } from "next";
import Link from "next/link";

import { Card, Etiqueta, brl, num, pct } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { IconeSeta } from "@/components/ui/icones";
import { prisma } from "@/server/db/client";
import { configuracao, exigirContexto, tarifaKwh } from "@/server/workspace/contexto";

export const metadata: Metadata = { title: "Ajustes" };

export default async function PaginaConfiguracoes() {
  const c = await exigirContexto();

  const [config, tarifa, impressoras, maoDeObra, membros] = await Promise.all([
    configuracao(c.ws),
    tarifaKwh(c.ws),
    prisma.printer.count({ where: { workspaceId: c.ws, ativa: true } }),
    prisma.laborRate.count({ where: { workspaceId: c.ws, ativo: true } }),
    prisma.membership.count({ where: { workspaceId: c.ws } }),
  ]);

  const secoes = [
    {
      href: "/configuracoes/impressoras",
      titulo: "Impressoras",
      texto: "Valor pago, vida útil e potência. É daqui que saem a depreciação e a energia.",
      estado:
        impressoras === 0
          ? { rotulo: "nenhuma cadastrada", tom: "prejuizo" as const }
          : { rotulo: `${impressoras} ativa${impressoras > 1 ? "s" : ""}`, tom: "lucro" as const },
    },
    {
      href: "/configuracoes/energia",
      titulo: "Energia",
      texto: "Sua conta de luz vira o R$/kWh real — com impostos e bandeira, não o da tabela.",
      estado: tarifa
        ? {
            rotulo: `${brl(tarifa.valor)}/kWh${tarifa.estimado ? " (estimado)" : ""}`,
            tom: tarifa.estimado ? ("atencao" as const) : ("lucro" as const),
          }
        : { rotulo: "sem conta lançada", tom: "prejuizo" as const },
    },
    {
      href: "/configuracoes/mao-de-obra",
      titulo: "Mão de obra",
      texto: "Quanto vale sua hora em cada etapa. O custo mais esquecido de quem vende 3D.",
      estado:
        maoDeObra === 0
          ? { rotulo: "sem valor-hora", tom: "prejuizo" as const }
          : { rotulo: `${maoDeObra} tipos`, tom: "lucro" as const },
    },
    {
      href: "/configuracoes/margem",
      titulo: "Margem e taxas",
      texto: "O ponto de partida de toda peça nova: markup, taxas do canal e custo indireto.",
      estado: {
        rotulo: `${pct(config.margemPadraoPct, 0)} de ${config.modoMargem === "MARKUP" ? "markup" : "margem"}`,
        tom: "marca" as const,
      },
    },
    {
      href: "/configuracoes/equipe",
      titulo: "Quem tem acesso",
      texto: "Convide alguém para o ateliê e escolha o que essa pessoa pode fazer.",
      estado: { rotulo: `${num(membros)} pessoa${membros > 1 ? "s" : ""}`, tom: "neutro" as const },
    },
  ];

  return (
    <Pagina
      titulo="Ajustes"
      descricao={`Configuração do ${config.negocioNome}. O que está aqui define o custo de toda peça nova — vale conferir antes de confiar no primeiro preço.`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {secoes.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full p-5 transition-colors hover:border-borda-forte hover:bg-superficie-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-texto">{s.titulo}</h2>
                <IconeSeta width={16} height={16} className="mt-0.5 shrink-0 text-texto-fraco" />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-texto-suave">{s.texto}</p>
              <div className="mt-3">
                <Etiqueta tom={s.estado.tom}>{s.estado.rotulo}</Etiqueta>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Pagina>
  );
}
