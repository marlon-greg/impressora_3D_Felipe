"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";

import { Campo, CampoNumero, Selecao, Marcador, BotaoEnviar } from "@/components/forms/campos";
import { Aviso, brl, num } from "@/components/ui";
import { Secao } from "@/components/ui/pagina";
import {
  CATEGORIAS,
  ORDEM_CATEGORIAS,
  ROTULO_UNIDADE,
  SIGLA_UNIDADE,
  custoUnitario,
  metrosDeFilamento,
  type Categoria,
  type Unidade,
} from "@/core/materiais/categorias";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoSalvarMaterial } from "./acoes";

export interface MaterialForm {
  id?: string;
  nome: string;
  categoria: Categoria;
  marca: string;
  tipoMaterial: string;
  cor: string;
  corHex: string;
  unidade: Unidade;
  tamanhoEmbalagem: string;
  precoEmbalagem: string;
  rendimentoPecas: string;
  diametroMm: string;
  densidadeGcm3: string;
  tempBico: string;
  tempMesa: string;
  estoqueMinimo: string;
  fornecedor: string;
  notas: string;
  precoEstimado: boolean;
}

export const MATERIAL_VAZIO: MaterialForm = {
  nome: "",
  categoria: "FILAMENTO",
  marca: "",
  tipoMaterial: "",
  cor: "",
  corHex: "",
  unidade: "G",
  tamanhoEmbalagem: "1000",
  precoEmbalagem: "",
  rendimentoPecas: "",
  diametroMm: "1.75",
  densidadeGcm3: "1.27",
  tempBico: "",
  tempMesa: "",
  estoqueMinimo: "0",
  fornecedor: "",
  notas: "",
  precoEstimado: false,
};

const paraNumero = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function FormularioMaterial({ inicial }: { inicial: MaterialForm }) {
  const [estado, enviar] = useActionState(acaoSalvarMaterial, VAZIO);
  const editando = Boolean(inicial.id);

  const [categoria, setCategoria] = useState<Categoria>(inicial.categoria);
  const [unidade, setUnidade] = useState<Unidade>(inicial.unidade);
  const [tamanho, setTamanho] = useState(inicial.tamanhoEmbalagem);
  const [preco, setPreco] = useState(inicial.precoEmbalagem);
  const [diametro, setDiametro] = useState(inicial.diametroMm);
  const [densidade, setDensidade] = useState(inicial.densidadeGcm3);
  const [corHex, setCorHex] = useState(inicial.corHex);

  const def = CATEGORIAS[categoria];

  // trocar de categoria reajusta unidade e embalagem — mas só no cadastro
  // novo: em edição isso sobrescreveria o que já está certo
  function trocarCategoria(nova: Categoria) {
    setCategoria(nova);
    if (editando) return;
    setUnidade(CATEGORIAS[nova].unidadePadrao);
    setTamanho(String(CATEGORIAS[nova].embalagemPadrao));
  }

  const unitario = useMemo(
    () => custoUnitario(paraNumero(preco), paraNumero(tamanho)),
    [preco, tamanho],
  );

  const metros = useMemo(
    () =>
      categoria === "FILAMENTO" && unidade === "G"
        ? metrosDeFilamento(paraNumero(tamanho), paraNumero(diametro), paraNumero(densidade))
        : 0,
    [categoria, unidade, tamanho, diametro, densidade],
  );

  return (
    <form action={enviar} noValidate>
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}

      {estado.mensagem && !estado.ok && (
        <div className="mb-5">
          <Aviso nivel="critico">{estado.mensagem}</Aviso>
        </div>
      )}

      <Secao titulo="O que é" numero={1}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao
            rotulo="Categoria"
            name="categoria"
            value={categoria}
            onChange={(e) => trocarCategoria(e.target.value as Categoria)}
            obrigatorio
            dica={def.ajuda}
            className="sm:col-span-2"
          >
            {ORDEM_CATEGORIAS.map((k) => (
              <option key={k} value={k}>
                {CATEGORIAS[k].icone} {CATEGORIAS[k].rotulo}
              </option>
            ))}
          </Selecao>

          <Campo
            rotulo="Nome"
            name="nome"
            defaultValue={inicial.nome}
            obrigatorio
            autoFocus
            erro={estado.campos?.nome}
            dica="Como você chama na prateleira."
            placeholder={categoria === "FILAMENTO" ? "PETG Preto Masterprint" : "Tinta Acrílica Branca"}
            className="sm:col-span-2"
          />

          <Campo rotulo="Marca" name="marca" defaultValue={inicial.marca} placeholder="Masterprint" />

          <Campo
            rotulo={categoria === "FILAMENTO" ? "Tipo do material" : "Tipo / acabamento"}
            name="tipoMaterial"
            defaultValue={inicial.tipoMaterial}
            placeholder={categoria === "FILAMENTO" ? "PETG" : "fosco"}
            dica={categoria === "FILAMENTO" ? "PETG, PLA, ABS, TPU..." : undefined}
          />

          <Campo rotulo="Cor" name="cor" defaultValue={inicial.cor} placeholder="Preto" />

          <div>
            <label htmlFor="corHex" className="mb-1.5 block text-sm font-medium text-texto">
              Cor na tela
            </label>
            <div className="flex gap-2">
              <input
                id="corHex"
                name="corHex"
                type="color"
                value={corHex || "#334155"}
                onChange={(e) => setCorHex(e.target.value)}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-borda-forte bg-superficie p-1"
              />
              <input
                readOnly
                value={corHex || "não definida"}
                aria-label="Código da cor"
                className="tabular w-full rounded-lg border border-borda-forte bg-superficie-2 px-3 text-sm text-texto-suave"
              />
              {corHex && (
                <button
                  type="button"
                  onClick={() => setCorHex("")}
                  className="shrink-0 rounded-lg px-3 text-sm font-medium text-texto-suave hover:bg-superficie-2 hover:text-texto"
                >
                  limpar
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-texto-suave">
              Só para reconhecer o rolo de relance na lista.
            </p>
          </div>
        </div>
      </Secao>

      <Secao
        titulo="Quanto vem e quanto custa"
        numero={2}
        descricao="É desta divisão que sai o custo por grama, por ml ou por unidade — a base de todo o cálculo de preço."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Selecao
            rotulo="Unidade de medida"
            name="unidade"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as Unidade)}
            obrigatorio
          >
            {(["G", "ML", "UN"] as Unidade[]).map((u) => (
              <option key={u} value={u}>
                {ROTULO_UNIDADE[u]}
              </option>
            ))}
          </Selecao>

          <CampoNumero
            rotulo="Tamanho da embalagem"
            name="tamanhoEmbalagem"
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
            unidade={SIGLA_UNIDADE[unidade]}
            obrigatorio
            erro={estado.campos?.tamanhoEmbalagem}
          />

          <CampoNumero
            rotulo="Preço pago na embalagem"
            name="precoEmbalagem"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            unidade="R$"
            obrigatorio
            erro={estado.campos?.precoEmbalagem}
          />
        </div>

        {unitario > 0 && (
          <div className="mt-4 rounded-lg border border-marca-200 bg-marca-50 px-4 py-3 dark:border-marca-800 dark:bg-marca-950/40">
            <p className="tabular text-sm font-semibold text-marca-900 dark:text-marca-100">
              {brl(unitario)} por {SIGLA_UNIDADE[unidade]}
            </p>
            {metros > 0 && (
              <p className="mt-1 text-xs text-marca-800 dark:text-marca-200">
                O rolo rende cerca de {num(metros, 0)} m de filamento. Se a etiqueta disser
                número bem diferente, confira o peso ou a densidade.
              </p>
            )}
          </div>
        )}

        {!def.divisivel && (
          <div className="mt-4">
            <CampoNumero
              rotulo="Quantas peças esse item rende"
              name="rendimentoPecas"
              defaultValue={inicial.rendimentoPecas}
              unidade="peças"
              dica="Um pincel pinta dezenas de peças; uma folha de lixa, poucas. O custo é rateado por esse número."
            />
          </div>
        )}

        <div className="mt-4">
          <Marcador
            rotulo="Este preço é uma estimativa, não o da nota fiscal"
            descricao="Marcado, a peça mostra um selo roxo avisando que o cálculo ainda não é confiável. Desmarque quando conferir o valor real."
            name="precoEstimado"
            defaultChecked={inicial.precoEstimado}
          />
        </div>
      </Secao>

      {categoria === "FILAMENTO" && (
        <Secao
          titulo="Dados do filamento"
          numero={3}
          descricao="Opcional. Servem para conferir o rendimento do rolo e para você não caçar a temperatura toda vez que trocar de marca."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CampoNumero
              rotulo="Diâmetro"
              name="diametroMm"
              value={diametro}
              onChange={(e) => setDiametro(e.target.value)}
              unidade="mm"
            />
            <CampoNumero
              rotulo="Densidade"
              name="densidadeGcm3"
              value={densidade}
              onChange={(e) => setDensidade(e.target.value)}
              unidade="g/cm³"
              dica="PLA 1,24 · PETG 1,27 · ABS 1,04"
            />
            <CampoNumero
              rotulo="Temperatura do bico"
              name="tempBico"
              defaultValue={inicial.tempBico}
              unidade="°C"
            />
            <CampoNumero
              rotulo="Temperatura da mesa"
              name="tempMesa"
              defaultValue={inicial.tempMesa}
              unidade="°C"
            />
          </div>
        </Secao>
      )}

      <Secao titulo="Estoque e origem" numero={categoria === "FILAMENTO" ? 4 : 3}>
        <div className="grid gap-4 sm:grid-cols-2">
          {!editando && (
            <CampoNumero
              rotulo="Quanto você tem agora"
              name="estoqueInicial"
              defaultValue=""
              unidade={SIGLA_UNIDADE[unidade]}
              dica="Vira a primeira entrada do extrato. Depois disso, só muda por movimentação."
            />
          )}

          <CampoNumero
            rotulo="Avisar quando cair abaixo de"
            name="estoqueMinimo"
            defaultValue={inicial.estoqueMinimo}
            unidade={SIGLA_UNIDADE[unidade]}
            erro={estado.campos?.estoqueMinimo}
            dica="Zero desliga o aviso."
          />

          <Campo
            rotulo="Onde você compra"
            name="fornecedor"
            defaultValue={inicial.fornecedor}
            placeholder="3D Fila, Mercado Livre, loja da esquina"
          />
        </div>

        <div className="mt-4">
          <label htmlFor="notas" className="mb-1.5 block text-sm font-medium text-texto">
            Observações
          </label>
          <textarea
            id="notas"
            name="notas"
            rows={3}
            defaultValue={inicial.notas}
            placeholder="Empena com pouca ventoinha · vem com 30 g a menos · secar antes de usar"
            className="w-full rounded-lg border border-borda-forte bg-superficie px-3.5 py-2.5 text-sm text-texto placeholder:text-texto-fraco focus:border-marca-600 focus:outline-none focus:ring-2 focus:ring-marca-600/20"
          />
        </div>
      </Secao>

      <div className="flex flex-wrap gap-3 pt-6">
        <div className="w-full sm:w-auto sm:min-w-48">
          <BotaoEnviar carregando="Salvando...">
            {editando ? "Salvar alterações" : "Cadastrar material"}
          </BotaoEnviar>
        </div>
        <Link
          href={inicial.id ? `/materiais/${inicial.id}` : "/materiais"}
          className="inline-flex items-center justify-center rounded-lg border border-borda-forte bg-superficie px-4 py-2.5 text-sm font-semibold text-texto hover:bg-superficie-2"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
