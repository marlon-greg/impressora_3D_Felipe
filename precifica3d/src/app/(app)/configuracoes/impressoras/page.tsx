import type { Metadata } from "next";

import { Card, CardTitulo, Etiqueta, SeloEstimado, Vazio, brl, num } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { prisma } from "@/server/db/client";
import { exigirEdicao } from "@/server/workspace/contexto";
import { acaoRemoverImpressora } from "../acoes";
import { FormularioImpressora, IMPRESSORA_VAZIA, type ImpressoraForm } from "./_formulario";

export const metadata: Metadata = { title: "Impressoras" };

const txt = (v: string | null | undefined) => v ?? "";
const nt = (v: number | null | undefined) => (v == null ? "" : String(v));

export default async function PaginaImpressoras({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const c = await exigirEdicao();
  const sp = await searchParams;
  const editando = typeof sp.editar === "string" ? sp.editar : null;

  const impressoras = await prisma.printer.findMany({
    where: { workspaceId: c.ws },
    orderBy: [{ ativa: "desc" }, { nome: "asc" }],
    include: { _count: { select: { projetos: true } } },
  });

  const alvo = editando ? impressoras.find((p) => p.id === editando) : null;

  const inicial: ImpressoraForm = alvo
    ? {
        id: alvo.id,
        nome: alvo.nome,
        marca: txt(alvo.marca),
        modelo: txt(alvo.modelo),
        tecnologia: alvo.tecnologia as "FDM" | "RESINA",
        valorPago: String(alvo.valorPago),
        vidaUtilHoras: String(alvo.vidaUtilHoras),
        manutencaoAnual: String(alvo.manutencaoAnual),
        horasUsoAnual: String(alvo.horasUsoAnual),
        potenciaWatts: String(alvo.potenciaWatts),
        volumeX: nt(alvo.volumeX),
        volumeY: nt(alvo.volumeY),
        volumeZ: nt(alvo.volumeZ),
        bicoMm: nt(alvo.bicoMm),
        notas: txt(alvo.notas),
      }
    : IMPRESSORA_VAZIA;

  return (
    <Pagina
      titulo="Impressoras"
      descricao="Cada hora de impressão gasta um pedaço da máquina. Sem esses números, a peça parece custar só o plástico."
      voltar={{ href: "/configuracoes", rotulo: "Ajustes" }}
    >
      <div className="space-y-6">
        {impressoras.length > 0 && (
          <Card>
            <CardTitulo>Cadastradas</CardTitulo>
            <ul className="divide-y divide-borda">
              {impressoras.map((p) => {
                const porHora =
                  (p.vidaUtilHoras > 0 ? p.valorPago / p.vidaUtilHoras : 0) +
                  (p.horasUsoAnual > 0 ? p.manutencaoAnual / p.horasUsoAnual : 0);

                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-texto">
                        {p.nome}
                        {!p.ativa && <Etiqueta tom="neutro">desativada</Etiqueta>}
                        {p.camposEstimados.length > 0 && <SeloEstimado />}
                      </p>
                      <p className="tabular mt-0.5 text-xs text-texto-suave">
                        {brl(p.valorPago)} · {p.potenciaWatts} W · {num(p.vidaUtilHoras)} h de vida
                        útil · <strong>{brl(porHora)}/h</strong> de desgaste
                        {p._count.projetos > 0 && ` · usada em ${p._count.projetos} peça(s)`}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <a
                        href={`/configuracoes/impressoras?editar=${p.id}`}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-texto-suave hover:bg-superficie-2 hover:text-texto"
                      >
                        editar
                      </a>
                      <form action={acaoRemoverImpressora}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-2 text-sm font-medium text-texto-suave hover:bg-superficie-2 hover:text-texto"
                        >
                          {p.ativa ? "desativar" : "reativar"}
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Card>
          <CardTitulo
            descricao={
              alvo
                ? "As mudanças valem para as próximas peças; as já calculadas guardam o custo do dia delas."
                : "Os valores de vida útil e manutenção são estimativas razoáveis — ajuste conforme sua experiência."
            }
          >
            {alvo ? `Editar ${alvo.nome}` : "Nova impressora"}
          </CardTitulo>
          <div className="px-5 py-5">
            {impressoras.length === 0 && (
              <div className="mb-5">
                <Vazio icone="🖨️" titulo="Nenhuma impressora ainda">
                  Sem ela, energia e depreciação ficam de fora e toda peça sai barata demais.
                </Vazio>
              </div>
            )}
            <FormularioImpressora key={alvo?.id ?? "nova"} inicial={inicial} />
          </div>
        </Card>
      </div>
    </Pagina>
  );
}
