"use client";

import { useActionState, useMemo, useState } from "react";

import { Campo, CampoNumero, Selecao, BotaoEnviar } from "@/components/forms/campos";
import { Aviso, brl, pct } from "@/components/ui";
import { Secao } from "@/components/ui/pagina";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoSalvarMargem } from "../acoes";

/** Exemplo vivo: mostrar o efeito num custo de R$ 100 explica melhor que texto. */
const CUSTO_EXEMPLO = 100;

export function FormularioMargem({
  inicial,
}: {
  inicial: {
    negocioNome: string;
    modoMargem: "MARKUP" | "MARGEM_LIQUIDA";
    margemPadraoPct: number;
    taxaCanalPadraoPct: number;
    taxaPagamentoPct: number;
    impostoPct: number;
    custoIndiretoMensal: number;
    horasProdutivasMes: number;
    embalagemPadrao: number;
  };
}) {
  const [estado, enviar] = useActionState(acaoSalvarMargem, VAZIO);

  const [modo, setModo] = useState(inicial.modoMargem);
  const [margem, setMargem] = useState(String(inicial.margemPadraoPct));
  const [canal, setCanal] = useState(String(inicial.taxaCanalPadraoPct));
  const [pagamento, setPagamento] = useState(String(inicial.taxaPagamentoPct));
  const [imposto, setImposto] = useState(String(inicial.impostoPct));
  const [indireto, setIndireto] = useState(String(inicial.custoIndiretoMensal));
  const [horas, setHoras] = useState(String(inicial.horasProdutivasMes));

  const nn = (s: string) => {
    const v = Number(s.replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  };

  const exemplo = useMemo(() => {
    const taxas = nn(canal) + nn(pagamento) + nn(imposto);
    const m = nn(margem);
    const fator = 1 - taxas / 100;

    const preco =
      modo === "MARKUP"
        ? fator > 0
          ? (CUSTO_EXEMPLO * (1 + m / 100)) / fator
          : CUSTO_EXEMPLO
        : (() => {
            const denom = 1 - (m + taxas) / 100;
            return denom > 0 ? CUSTO_EXEMPLO / denom : CUSTO_EXEMPLO;
          })();

    const emTaxas = preco * (taxas / 100);
    const lucro = preco - emTaxas - CUSTO_EXEMPLO;
    return { preco, emTaxas, lucro, taxas, margemReal: preco > 0 ? (lucro / preco) * 100 : 0 };
  }, [modo, margem, canal, pagamento, imposto]);

  const porHora = nn(horas) > 0 ? nn(indireto) / nn(horas) : 0;

  return (
    <form action={enviar} noValidate>
      {estado.mensagem && (
        <div className="mb-5">
          <Aviso nivel={estado.ok ? "sucesso" : "critico"}>{estado.mensagem}</Aviso>
        </div>
      )}

      <Secao titulo="O ateliê">
        <Campo
          rotulo="Nome do negócio"
          name="negocioNome"
          defaultValue={inicial.negocioNome}
          obrigatorio
          erro={estado.campos?.negocioNome}
          className="max-w-md"
        />
      </Secao>

      <Secao
        titulo="Margem"
        descricao="Markup e margem líquida com o mesmo número dão preços bem diferentes. Escolher errado aqui é o erro que mais faz vendedor de peça 3D achar que está lucrando o dobro do que lucra."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao
            rotulo="Como você pensa"
            name="modoMargem"
            value={modo}
            onChange={(e) => setModo(e.target.value as typeof modo)}
          >
            <option value="MARKUP">Markup — ponho X% em cima do custo</option>
            <option value="MARGEM_LIQUIDA">Margem líquida — X% do preço é meu lucro</option>
          </Selecao>

          <CampoNumero
            rotulo={modo === "MARKUP" ? "Markup padrão" : "Margem líquida padrão"}
            name="margemPadraoPct"
            value={margem}
            onChange={(e) => setMargem(e.target.value)}
            unidade="%"
            erro={estado.campos?.margemPadraoPct}
          />
        </div>
      </Secao>

      <Secao
        titulo="Taxas"
        descricao="Saem por cima do preço, não da margem. Se o marketplace fica com 15%, o preço precisa subir para você receber o que planejou."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoNumero
            rotulo="Canal de venda"
            name="taxaCanalPadraoPct"
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            unidade="%"
            dica="Mercado Livre, Shopee, Elo7."
            erro={estado.campos?.taxaCanalPadraoPct}
          />
          <CampoNumero
            rotulo="Pagamento"
            name="taxaPagamentoPct"
            value={pagamento}
            onChange={(e) => setPagamento(e.target.value)}
            unidade="%"
            dica="Maquininha, link de pagamento."
            erro={estado.campos?.taxaPagamentoPct}
          />
          <CampoNumero
            rotulo="Imposto"
            name="impostoPct"
            value={imposto}
            onChange={(e) => setImposto(e.target.value)}
            unidade="%"
            dica="MEI costuma ficar em 0."
            erro={estado.campos?.impostoPct}
          />
        </div>

        <div className="mt-5 rounded-lg border border-marca-200 bg-marca-50 p-4 dark:border-marca-800 dark:bg-marca-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-marca-700 dark:text-marca-300">
            Numa peça que custa {brl(CUSTO_EXEMPLO)}
          </p>
          <p className="tabular mt-2 text-2xl font-bold text-texto">{brl(exemplo.preco)}</p>
          <p className="mt-1 text-sm leading-relaxed text-texto-suave">
            As taxas levam {brl(exemplo.emTaxas)} ({pct(exemplo.taxas)}), o custo leva{" "}
            {brl(CUSTO_EXEMPLO)}, e sobram <strong className="text-texto">{brl(exemplo.lucro)}</strong>{" "}
            — {pct(exemplo.margemReal)} do preço final.
          </p>
        </div>
      </Secao>

      <Secao
        titulo="Custo indireto"
        descricao="Internet, software, aluguel do espaço, luz que não é da impressora. Rateado por hora de trabalho humano, entra um pouquinho em cada peça em vez de sumir."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoNumero
            rotulo="Custo fixo por mês"
            name="custoIndiretoMensal"
            value={indireto}
            onChange={(e) => setIndireto(e.target.value)}
            unidade="R$"
          />
          <CampoNumero
            rotulo="Horas produtivas por mês"
            name="horasProdutivasMes"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            unidade="h"
            dica="Quantas horas por mês você realmente trabalha nas peças."
            erro={estado.campos?.horasProdutivasMes}
          />
          <CampoNumero
            rotulo="Embalagem padrão"
            name="embalagemPadrao"
            defaultValue={inicial.embalagemPadrao}
            unidade="R$"
            dica="Já vem preenchido em cada peça nova."
          />
        </div>

        {porHora > 0 && (
          <p className="tabular mt-3 text-sm text-texto-suave">
            Dá <strong className="text-texto">{brl(porHora)}</strong> por hora de trabalho, somados
            a cada peça conforme o tempo que ela toma de você.
          </p>
        )}
      </Secao>

      <div className="max-w-xs pt-6">
        <BotaoEnviar carregando="Salvando...">Salvar ajustes</BotaoEnviar>
      </div>
    </form>
  );
}
