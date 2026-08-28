import type { Metadata } from "next";

import { Aviso, Card, CardTitulo, Etiqueta, Metrica, Tabela, Td, Th, brl, num, pct, tempoRelativo } from "@/components/ui";
import { Grade, Pagina } from "@/components/ui/pagina";
import { IconeCaiu, IconeSubiu } from "@/components/ui/icones";
import { prisma } from "@/server/db/client";
import { exigirContexto, podeAdministrar } from "@/server/workspace/contexto";
import { estadoColetas, historico, valoresAtuais, variacao } from "@/server/market/read";
import { GraficoVariacao } from "./_grafico";
import { BotaoColetar } from "./_coletar";

export const metadata: Metadata = { title: "Mercado" };

const TIPOS_FILAMENTO = ["PETG", "PLA", "ABS", "TPU"];

export default async function PaginaMercado() {
  const c = await exigirContexto();

  const [valores, varDolar, varEuro, varPetg, serieDolar, seriePetg, coletas, lojas] =
    await Promise.all([
      valoresAtuais(["USD-BRL", "EUR-BRL", "IPCA", "IGPM", ...TIPOS_FILAMENTO.map((t) => `${t}-MEDIA-KG`)]),
      variacao("USD-BRL", 30),
      variacao("EUR-BRL", 30),
      variacao("PETG-MEDIA-KG", 30),
      historico("USD-BRL", 90),
      historico("PETG-MEDIA-KG", 90),
      estadoColetas(),
      prisma.marketMaterialPrice.findMany({
        orderBy: { coletadoEm: "desc" },
        take: 60,
      }),
    ]);

  const dolar = valores["USD-BRL"];
  const euro = valores["EUR-BRL"];
  const ipca = valores["IPCA"];
  const igpm = valores["IGPM"];

  // uma linha por produto: a coleta grava histórico, e repetir o mesmo item
  // várias vezes só polui a tabela
  const vistos = new Set<string>();
  const precosLojas = lojas.filter((l) => {
    const chave = `${l.loja}|${l.produto}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });

  const filamentos = TIPOS_FILAMENTO.map((t) => ({ tipo: t, valor: valores[`${t}-MEDIA-KG`] })).filter(
    (f) => f.valor,
  );

  const algumaFalha = coletas.some((c) => !c.sucesso);

  return (
    <Pagina
      titulo="Mercado"
      largura="larga"
      descricao="Câmbio, inflação e preço de filamento praticado nas lojas. Tudo vem do cache: nenhuma tela busca na internet, então nada aqui trava se um site sair do ar."
      acao={podeAdministrar(c.papel) && <BotaoColetar />}
    >
      <Grade colunas={4}>
        <Card className="p-5">
          <Metrica
            rotulo="Dólar"
            valor={dolar ? brl(dolar.valor) : "—"}
            detalhe={
              varDolar
                ? `${varDolar.subiu ? "+" : ""}${pct(varDolar.variacaoPct)} em 30 dias`
                : dolar
                  ? `coletado ${tempoRelativo(dolar.coletadoEm)}`
                  : "sem coleta"
            }
            tom={varDolar ? (varDolar.subiu ? "prejuizo" : "lucro") : "neutro"}
            dica="Filamento é importado ou indexado ao dólar. Quando ele sobe, seu insumo sobe algumas semanas depois."
          />
        </Card>
        <Card className="p-5">
          <Metrica
            rotulo="Euro"
            valor={euro ? brl(euro.valor) : "—"}
            detalhe={
              varEuro
                ? `${varEuro.subiu ? "+" : ""}${pct(varEuro.variacaoPct)} em 30 dias`
                : "referência"
            }
          />
        </Card>
        <Card className="p-5">
          <Metrica
            rotulo="IPCA acumulado"
            valor={ipca ? pct(ipca.valor) : "—"}
            detalhe={ipca ? "12 meses · Banco Central" : "sem coleta"}
            dica="Se seu insumo subiu menos que isso, na prática ele ficou mais barato."
          />
        </Card>
        <Card className="p-5">
          <Metrica
            rotulo="IGP-M acumulado"
            valor={igpm ? pct(igpm.valor) : "—"}
            detalhe={igpm ? "12 meses · Banco Central" : "sem coleta"}
          />
        </Card>
      </Grade>

      {dolar?.desatualizado && (
        <div className="mt-5">
          <Aviso nivel="atencao">
            A última coleta de câmbio foi {tempoRelativo(dolar.coletadoEm)} e já passou da
            validade. O valor mostrado é o último que deu certo — continua servindo de
            referência, mas não é o de hoje.
          </Aviso>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitulo descricao="Últimos 90 dias.">Dólar</CardTitulo>
          <GraficoVariacao pontos={serieDolar} cor="#0d9488" casas={2} />
        </Card>
        <Card>
          <CardTitulo descricao="Mediana das lojas brasileiras, últimos 90 dias.">
            PETG por quilo
          </CardTitulo>
          <GraficoVariacao pontos={seriePetg} cor="#7c3aed" casas={2} />
        </Card>
      </div>

      {filamentos.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardTitulo descricao="Mediana coletada nas lojas. Serve para conferir se você está comprando bem — não é o seu custo, que vem do que você pagou de verdade.">
              Preço de referência por tipo
            </CardTitulo>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {filamentos.map((f) => {
                const meta = f.valor.meta as { amostras?: number; minimo?: number; maximo?: number } | null;
                return (
                  <div key={f.tipo}>
                    <Metrica
                      rotulo={`${f.tipo} por kg`}
                      valor={brl(f.valor.valor)}
                      detalhe={
                        meta?.minimo && meta?.maximo
                          ? `${brl(meta.minimo)} a ${brl(meta.maximo)} · ${meta.amostras ?? 0} amostras`
                          : `${meta?.amostras ?? 0} amostras`
                      }
                    />
                    {f.tipo === "PETG" && varPetg && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-texto-suave">
                        {varPetg.subiu ? (
                          <IconeSubiu width={13} height={13} className="mt-0.5 shrink-0 text-prejuizo" />
                        ) : (
                          <IconeCaiu width={13} height={13} className="mt-0.5 shrink-0 text-lucro" />
                        )}
                        {varPetg.subiu ? "subiu" : "caiu"} {pct(Math.abs(varPetg.variacaoPct))} em 30 dias
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {precosLojas.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardTitulo descricao="O que cada loja estava cobrando na última coleta.">
              Preços por loja
            </CardTitulo>
            <Tabela>
              <thead>
                <tr>
                  <Th>Produto</Th>
                  <Th>Loja</Th>
                  <Th>Tipo</Th>
                  <Th className="text-right">Preço</Th>
                  <Th className="text-right">Por kg</Th>
                  <Th>Coletado</Th>
                </tr>
              </thead>
              <tbody>
                {precosLojas.slice(0, 25).map((l) => (
                  <tr key={l.id}>
                    <Td className="max-w-64 truncate">
                      {l.url ? (
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {l.produto}
                        </a>
                      ) : (
                        l.produto
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-texto-suave">{l.loja}</Td>
                    <Td>{l.tipoMaterial && <Etiqueta>{l.tipoMaterial}</Etiqueta>}</Td>
                    <Td className="tabular text-right whitespace-nowrap">{brl(l.precoBRL)}</Td>
                    <Td className="tabular text-right whitespace-nowrap font-medium">
                      {brl(l.precoPorKg)}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-texto-suave">
                      {tempoRelativo(l.coletadoEm)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card>
          <CardTitulo
            descricao="Se um coletor falhar, o app continua com o último valor bom. Aqui você vê qual foi e por quê."
          >
            Diagnóstico da coleta
          </CardTitulo>

          {coletas.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-texto-suave">
              A coleta ainda não rodou nenhuma vez.
            </p>
          ) : (
            <ul className="divide-y divide-borda">
              {coletas.map((k) => (
                <li key={k.coletor} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <Etiqueta tom={k.sucesso ? "lucro" : "prejuizo"}>
                    {k.sucesso ? "ok" : "falhou"}
                  </Etiqueta>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-texto">{k.coletor}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-texto-suave">
                      {k.mensagem ?? (k.sucesso ? `${k.itens} valores gravados.` : "sem detalhe")}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-texto-fraco">
                    {tempoRelativo(k.quando)}
                  </span>

                  {podeAdministrar(c.papel) && !k.sucesso && (
                    <div className="w-full sm:w-auto">
                      <BotaoColetar coletor={k.coletor} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {algumaFalha && (
        <div className="mt-5">
          <Aviso nivel="info" titulo="Falha de coletor não é falha do sistema">
            Sites de loja mudam de layout sem avisar e o coletor daquela loja para de achar o
            preço. Quando isso acontece, o valor anterior continua sendo servido e marcado como
            desatualizado — nenhuma tela quebra, e nenhum cálculo usa número inventado.
          </Aviso>
        </div>
      )}
    </Pagina>
  );
}
