import "server-only";
import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

/**
 * Armazenamento das fotos, no Supabase Storage.
 *
 * Duas decisões que valem explicar:
 *
 * 1. A chave usada é a `service_role`, que ignora as políticas de acesso do
 *    Supabase. Ela só pode existir no servidor — com prefixo NEXT_PUBLIC_ ela
 *    iria para o navegador e daria a qualquer visitante poder total sobre o
 *    bucket. Por isso o upload passa por Server Action, e não vai direto do
 *    navegador para o Supabase.
 *
 * 2. Enquanto o Supabase não estiver configurado, tudo aqui responde
 *    "não configurado" em vez de explodir. O resto do app continua
 *    funcionando: fotos são um extra, não o produto.
 */

export interface ArquivoSalvo {
  url: string;
  path: string;
  bytes: number;
  tipo: string;
}

export type ResultadoUpload =
  | { ok: true; arquivo: ArquivoSalvo }
  | { ok: false; erro: string };

/** Formatos que o navegador exibe sem plugin e que a câmera do celular gera. */
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"];
const EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
};

/** 8 MB: foto de celular moderno cabe, e um vídeo trocado por engano não. */
const TAMANHO_MAX = 8 * 1024 * 1024;

export function storageConfigurado(): boolean {
  const e = env();
  return Boolean(e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY);
}

let cliente: SupabaseClient | null = null;

function obterCliente(): SupabaseClient | null {
  if (!storageConfigurado()) return null;
  if (cliente) return cliente;

  const e = env();
  cliente = createClient(e.SUPABASE_URL!, e.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}

export const MOTIVO_NAO_CONFIGURADO =
  "O armazenamento de fotos ainda não foi configurado. Crie um projeto no Supabase, um bucket público, e preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.";

export async function enviarFoto(
  arquivo: File,
  destino: { workspaceId: string; projectId: string },
): Promise<ResultadoUpload> {
  const sb = obterCliente();
  if (!sb) return { ok: false, erro: MOTIVO_NAO_CONFIGURADO };

  // validação no servidor: o `accept` do input é conveniência, não barreira
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return {
      ok: false,
      erro: `"${arquivo.name}" não é uma imagem que o navegador saiba mostrar. Use JPG, PNG ou WEBP.`,
    };
  }
  if (arquivo.size > TAMANHO_MAX) {
    const mb = (arquivo.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      erro: `"${arquivo.name}" tem ${mb} MB e o limite é 8 MB. Tire a foto em resolução menor ou reduza antes de enviar.`,
    };
  }

  const ext = EXTENSAO[arquivo.type] ?? "jpg";
  // nome aleatório: o original pode ter acento, espaço e até o nome do cliente
  const path = `${destino.workspaceId}/${destino.projectId}/${randomBytes(12).toString("hex")}.${ext}`;

  const bucket = env().SUPABASE_BUCKET;
  const { error } = await sb.storage.from(bucket).upload(path, arquivo, {
    contentType: arquivo.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    return {
      ok: false,
      erro: /bucket not found/i.test(error.message)
        ? `O bucket "${bucket}" não existe no seu projeto Supabase. Crie-o como público e tente de novo.`
        : `O Supabase recusou o envio: ${error.message}`,
    };
  }

  const { data } = sb.storage.from(bucket).getPublicUrl(path);

  return {
    ok: true,
    arquivo: { url: data.publicUrl, path, bytes: arquivo.size, tipo: arquivo.type },
  };
}

/**
 * Apaga do bucket. Falha aqui não é motivo para abortar: se o registro sumiu
 * do banco e o arquivo ficou, sobra um órfão invisível — chato, não grave. O
 * contrário (registro apontando para arquivo inexistente) quebraria a galeria.
 */
export async function apagarFoto(path: string): Promise<void> {
  const sb = obterCliente();
  if (!sb) return;
  const { error } = await sb.storage.from(env().SUPABASE_BUCKET).remove([path]);
  if (error) console.error("[storage] não consegui apagar", path, error.message);
}
