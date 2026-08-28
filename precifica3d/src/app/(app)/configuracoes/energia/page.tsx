import type { Metadata } from "next";

import { Aviso, Card, CardTitulo, Etiqueta, SeloEstimado, brl, num } from "@/components/ui";
import { Pagina } from "@/components/ui/pagina";
import { prisma } from "@/server/db/client";
import { exigirEdicao } from "@/server/workspace/contexto";
import { acaoAtivarTarifa } from "../acoes";
import { FormularioTarifa } from "./_formulario";

export const metadata: Metadata = { title: "Energia" };

const BANDEIRAS: Record<string, string> = {
  VERDE: "verde",
  AMARELA: "amarela",
  VERMELHA_1: "vermelha 1",
  VERMELHA_2: "vermelha 2",
};

export default async function PaginaEnergia() {
  const c = await exigirEdicao();

  const tarifas = await prisma.energyTariff.findMany({
    where: { workspaceId: c.ws },
    orderBy: [{ ativa: "desc" }, { criadoEm: "desc" }],
  });

  const ativa = tarifas.find((t) => t.ativa);
  const soEstimada = ativa?.estimado ?? false;

  return (
    <Pagina
      titulo="Energia"
      descricao="O custo de imprimir sai da sua conta de luz, não de uma tabela. Divide-se o valor pago pelo consumo do mês e pronto: é o R$/kWh que você paga de verdade."
      voltar={{ href: "/configuracoes", rotulo: "Ajustes" }}
    >
      {soEstimada && (
        <div className="mb-6">
          <Aviso nivel="atencao" titulo="A tarifa em uso é uma estimativa">
            Ela veio do cadastro inicial, não da sua conta. Lance uma conta de verdade abaixo — é
            questão de dois números e o custo de energia passa a estar certo.
          </Aviso>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardTitulo descricao="A mais recente vira a que o cálculo usa. As anteriores ficam de histórico.">
            Lançar conta de luz
          </CardTitulo>
          <div className="px-5 py-5">
            <FormularioTarifa />
          </div>
        </Card>

        {tarifas.length > 0 && (
          <Card>
            <CardTitulo>Contas lançadas</CardTitulo>
            <ul className="divide-y divide-borda">
              {tarifas.map((t) => {
                const kwh = t.consumoKwh > 0 ? t.valorConta / t.consumoKwh : 0;
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-texto">
                        {t.referencia}
                        {t.ativa && <Etiqueta tom="lucro">em uso</Etiqueta>}
                        {t.estimado && <SeloEstimado />}
                      </p>
                      <p className="tabular mt-0.5 text-xs text-texto-suave">
                        {brl(t.valorConta)} ÷ {num(t.consumoKwh)} kWh ={" "}
                        <strong>{brl(kwh)}/kWh</strong>
                        {t.distribuidora && ` · ${t.distribuidora}`} · bandeira{" "}
                        {BANDEIRAS[t.bandeira] ?? t.bandeira}
                      </p>
                    </div>

                    {!t.ativa && (
                      <form action={acaoAtivarTarifa} className="shrink-0">
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-2 text-sm font-medium text-texto-suave hover:bg-superficie-2 hover:text-texto"
                        >
                          usar esta
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </Pagina>
  );
}
