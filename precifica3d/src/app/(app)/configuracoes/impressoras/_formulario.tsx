"use client";

import { useActionState, useMemo, useState } from "react";

import { Campo, CampoNumero, Selecao, BotaoEnviar } from "@/components/forms/campos";
import { Aviso, brl } from "@/components/ui";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoSalvarImpressora } from "../acoes";

export interface ImpressoraForm {
  id?: string;
  nome: string;
  marca: string;
  modelo: string;
  tecnologia: "FDM" | "RESINA";
  valorPago: string;
  vidaUtilHoras: string;
  manutencaoAnual: string;
  horasUsoAnual: string;
  potenciaWatts: string;
  volumeX: string;
  volumeY: string;
  volumeZ: string;
  bicoMm: string;
  notas: string;
}

export const IMPRESSORA_VAZIA: ImpressoraForm = {
  nome: "",
  marca: "",
  modelo: "",
  tecnologia: "FDM",
  valorPago: "",
  vidaUtilHoras: "6000",
  manutencaoAnual: "",
  horasUsoAnual: "1000",
  potenciaWatts: "150",
  volumeX: "",
  volumeY: "",
  volumeZ: "",
  bicoMm: "0.4",
  notas: "",
};

export function FormularioImpressora({ inicial }: { inicial: ImpressoraForm }) {
  const [estado, enviar] = useActionState(acaoSalvarImpressora, VAZIO);
  const [valor, setValor] = useState(inicial.valorPago);
  const [vida, setVida] = useState(inicial.vidaUtilHoras);
  const [manut, setManut] = useState(inicial.manutencaoAnual);
  const [usoAnual, setUsoAnual] = useState(inicial.horasUsoAnual);
  const [watts, setWatts] = useState(inicial.potenciaWatts);

  const nn = (s: string) => {
    const v = Number(s.replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  };

  // o que essa máquina custa por hora ligada — o número que ele nunca calculou
  const custoHora = useMemo(() => {
    const depreciacao = nn(vida) > 0 ? nn(valor) / nn(vida) : 0;
    const manutencao = nn(usoAnual) > 0 ? nn(manut) / nn(usoAnual) : 0;
    const energia = (nn(watts) / 1000) * 0.95; // tarifa típica só para ilustrar
    return { depreciacao, manutencao, energia, total: depreciacao + manutencao + energia };
  }, [valor, vida, manut, usoAnual, watts]);

  return (
    <form action={enviar} className="space-y-5" noValidate>
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}

      {estado.mensagem && (
        <Aviso nivel={estado.ok ? "sucesso" : "critico"}>{estado.mensagem}</Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Nome"
          name="nome"
          defaultValue={inicial.nome}
          obrigatorio
          placeholder="Kobra X"
          erro={estado.campos?.nome}
        />
        <Selecao rotulo="Tecnologia" name="tecnologia" defaultValue={inicial.tecnologia}>
          <option value="FDM">FDM (filamento)</option>
          <option value="RESINA">Resina</option>
        </Selecao>
        <Campo rotulo="Marca" name="marca" defaultValue={inicial.marca} placeholder="Anycubic" />
        <Campo rotulo="Modelo" name="modelo" defaultValue={inicial.modelo} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoNumero
          rotulo="Quanto você pagou"
          name="valorPago"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          unidade="R$"
          obrigatorio
          erro={estado.campos?.valorPago}
        />
        <CampoNumero
          rotulo="Vida útil estimada"
          name="vidaUtilHoras"
          value={vida}
          onChange={(e) => setVida(e.target.value)}
          unidade="h"
          dica="Quantas horas de impressão até ela se pagar. 6000 h é uma estimativa conservadora."
          erro={estado.campos?.vidaUtilHoras}
        />
        <CampoNumero
          rotulo="Manutenção por ano"
          name="manutencaoAnual"
          value={manut}
          onChange={(e) => setManut(e.target.value)}
          unidade="R$"
          dica="Bico, correia, PTFE, mesa. O que você gasta por ano para ela seguir imprimindo."
        />
        <CampoNumero
          rotulo="Horas de uso por ano"
          name="horasUsoAnual"
          value={usoAnual}
          onChange={(e) => setUsoAnual(e.target.value)}
          unidade="h"
          dica="Serve para diluir a manutenção. 1000 h ≈ 3 h por dia."
          erro={estado.campos?.horasUsoAnual}
        />
        <CampoNumero
          rotulo="Potência"
          name="potenciaWatts"
          value={watts}
          onChange={(e) => setWatts(e.target.value)}
          unidade="W"
          dica="Está na etiqueta atrás da máquina. FDM comum fica entre 150 e 350 W."
        />
        <CampoNumero rotulo="Diâmetro do bico" name="bicoMm" defaultValue={inicial.bicoMm} unidade="mm" />
      </div>

      {custoHora.total > 0 && (
        <div className="rounded-lg border border-marca-200 bg-marca-50 p-4 dark:border-marca-800 dark:bg-marca-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-marca-700 dark:text-marca-300">
            Esta máquina custa por hora ligada
          </p>
          <p className="tabular mt-2 text-2xl font-bold text-texto">{brl(custoHora.total)}/h</p>
          <p className="mt-1 text-sm leading-relaxed text-texto-suave">
            {brl(custoHora.depreciacao)} de depreciação + {brl(custoHora.manutencao)} de manutenção
            + cerca de {brl(custoHora.energia)} de energia. Uma peça de 10 h já gasta{" "}
            {brl(custoHora.total * 10)} só de máquina, antes do plástico.
          </p>
        </div>
      )}

      <p className="text-sm font-medium text-texto">Volume de impressão</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoNumero rotulo="X" name="volumeX" defaultValue={inicial.volumeX} unidade="mm" />
        <CampoNumero rotulo="Y" name="volumeY" defaultValue={inicial.volumeY} unidade="mm" />
        <CampoNumero rotulo="Z" name="volumeZ" defaultValue={inicial.volumeZ} unidade="mm" />
      </div>

      <div>
        <label htmlFor="notas" className="mb-1.5 block text-sm font-medium text-texto">
          Observações
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          defaultValue={inicial.notas}
          placeholder="Mesa empena do lado esquerdo · trocar bico a cada 300 h"
          className="w-full rounded-lg border border-borda-forte bg-superficie px-3.5 py-2.5 text-sm text-texto placeholder:text-texto-fraco focus:border-marca-600 focus:outline-none focus:ring-2 focus:ring-marca-600/20"
        />
      </div>

      <div className="max-w-xs">
        <BotaoEnviar carregando="Salvando...">
          {inicial.id ? "Salvar impressora" : "Cadastrar impressora"}
        </BotaoEnviar>
      </div>
    </form>
  );
}
