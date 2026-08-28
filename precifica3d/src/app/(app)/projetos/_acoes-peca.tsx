"use client";

import { useActionState } from "react";

import { Aviso, brl } from "@/components/ui";
import { CampoNumero, BotaoEnviar } from "@/components/forms/campos";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoDefinirPreco, acaoBaixarInsumos } from "./acoes";

/** Adotar um preço: é ele que aparece na lista e vira referência do anúncio. */
export function DefinirPreco({
  slug,
  atual,
  sugerido,
}: {
  slug: string;
  atual: number | null;
  sugerido: number;
}) {
  const [estado, enviar] = useActionState(acaoDefinirPreco, VAZIO);

  return (
    <form action={enviar} className="space-y-4 px-5 py-5">
      <input type="hidden" name="slug" value={slug} />

      {estado.mensagem && (
        <Aviso nivel={estado.ok ? "sucesso" : "critico"}>{estado.mensagem}</Aviso>
      )}

      <CampoNumero
        rotulo="Preço que você vai praticar"
        name="precoDefinido"
        defaultValue={atual ?? sugerido}
        unidade="R$"
        dica={`O cálculo sugere ${brl(sugerido)}. Você pode adotar outro — o importante é ser uma escolha, não um chute.`}
      />

      <BotaoEnviar carregando="Salvando...">
        {atual == null ? "Adotar este preço" : "Atualizar preço"}
      </BotaoEnviar>
    </form>
  );
}

/**
 * Fecha o ciclo: produziu, o material sai do estoque.
 * Sem isto o estoque só desce se ele abrir cada material e dar baixa à mão.
 */
export function BaixarInsumos({ slug, itens }: { slug: string; itens: number }) {
  const [estado, enviar] = useActionState(acaoBaixarInsumos, VAZIO);

  return (
    <form action={enviar} className="space-y-4 px-5 py-5">
      <input type="hidden" name="slug" value={slug} />

      {estado.mensagem && (
        <Aviso nivel={estado.ok ? "sucesso" : "critico"}>{estado.mensagem}</Aviso>
      )}

      <p className="text-sm leading-relaxed text-texto-suave">
        Dá baixa nos {itens} materiais desta peça, com o desperdício incluído. Cada extrato vai
        mostrar esta peça como motivo.
      </p>

      <BotaoEnviar carregando="Baixando..." variante="secundario">
        Produzi esta peça — baixar do estoque
      </BotaoEnviar>
    </form>
  );
}
