import { redirect } from "next/navigation";

import { sessaoAtual } from "@/server/auth/session";

/**
 * A raiz não tem conteúdo próprio: é só um desvio. Na prática o `proxy.ts`
 * resolve antes, olhando só o cookie — isto aqui cobre o caso de alguém
 * chegar por um caminho que o matcher não pega.
 */
export default async function Raiz() {
  const sessao = await sessaoAtual();
  redirect(sessao ? "/painel" : "/entrar");
}
