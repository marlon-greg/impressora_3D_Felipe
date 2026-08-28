"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin } from "@/server/workspace/contexto";
import { coletarTudo, coletarUm, type ResultadoExecucao } from "@/server/market/runner";
import { consumir, mensagemEspera } from "@/server/auth/rate-limit";
import type { EstadoForm } from "@/app/(auth)/estado";

/**
 * Coleta sob demanda.
 *
 * Tem limite por workspace de propósito: cada execução bate em site de
 * terceiro, e clicar dez vezes no botão é a receita para tomar bloqueio de IP
 * e ficar sem dado nenhum. O agendamento diário continua sendo o caminho
 * normal — o botão é para quando ele quer conferir agora.
 */
export async function acaoColetarAgora(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const c = await exigirAdmin();

  const limite = await consumir("coletaManual", c.ws);
  if (!limite.permitido) {
    return { ok: false, mensagem: mensagemEspera(limite.esperarS) };
  }

  const alvo = String(dados.get("coletor") ?? "").trim();

  try {
    // coletarTudo devolve um resumo com a lista dentro; coletarUm, um resultado só
    const resultados: ResultadoExecucao[] = alvo
      ? [await coletarUm(alvo, true)]
      : (await coletarTudo({ forcar: true })).resultados;

    const ok = resultados.filter((r) => r.status === "OK");
    const falhou = resultados.filter((r) => r.status === "FALHOU");
    const pulado = resultados.filter((r) => r.status === "PULADO");

    revalidatePath("/mercado");
    revalidatePath("/painel");

    const itens = ok.reduce((s, r) => s + r.itens, 0);
    const partes = [
      ok.length > 0 ? `${ok.length} coletor(es) atualizados, ${itens} valores novos` : null,
      falhou.length > 0 ? `${falhou.length} falharam (${falhou.map((f) => f.nome).join(", ")})` : null,
      pulado.length > 0 ? `${pulado.length} pulados por falta de credencial` : null,
    ].filter(Boolean);

    return {
      ok: ok.length > 0,
      mensagem:
        partes.length > 0
          ? `${partes.join(" · ")}.`
          : "Nada foi coletado. Veja o diagnóstico abaixo.",
    };
  } catch (e) {
    return {
      ok: false,
      mensagem: `A coleta quebrou: ${e instanceof Error ? e.message : "erro desconhecido"}. Os valores anteriores continuam valendo.`,
    };
  }
}
