"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { Aviso } from "@/components/ui";
import { BotaoEnviar } from "@/components/forms/campos";
import { IconeFoto } from "@/components/ui/icones";
import { VAZIO } from "@/app/(auth)/estado";
import { acaoEnviarFotos } from "./acoes";

/**
 * Envio de fotos: escolher, arrastar ou colar.
 *
 * O Ctrl+V é o caminho que ele mais vai usar sem perceber — recorta a foto no
 * celular ou dá print da tela do fatiador e cola direto aqui, sem passar por
 * salvar-arquivo-procurar-arquivo.
 */
export function Enviador({ slug, tipo }: { slug: string; tipo: "VENDA" | "FABRICACAO" }) {
  const [estado, enviar] = useActionState(acaoEnviarFotos, VAZIO);
  const [arrastando, setArrastando] = useState(false);
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  /** DataTransfer é a única forma de programar o conteúdo de um <input file>. */
  function definirArquivos(lista: FileList | File[]) {
    if (!input.current) return;
    const dt = new DataTransfer();
    for (const f of Array.from(lista).slice(0, 10)) dt.items.add(f);
    input.current.files = dt.files;
    setEscolhidas(Array.from(dt.files).map((f) => f.name));
  }

  // colar imagem do clipboard, em qualquer lugar da página
  useEffect(() => {
    function aoColar(e: ClipboardEvent) {
      const imagens = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (imagens.length > 0) {
        e.preventDefault();
        definirArquivos(imagens);
      }
    }
    document.addEventListener("paste", aoColar);
    return () => document.removeEventListener("paste", aoColar);
  }, []);

  return (
    <form action={enviar} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="tipo" value={tipo} />

      {estado.mensagem && (
        <Aviso nivel={estado.ok ? "sucesso" : "critico"}>{estado.mensagem}</Aviso>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (e.dataTransfer.files.length) definirArquivos(e.dataTransfer.files);
        }}
        className={clsx(
          "rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors",
          arrastando
            ? "border-marca-600 bg-marca-50 dark:bg-marca-950/40"
            : "border-borda-forte bg-superficie-2/40",
        )}
      >
        <IconeFoto width={28} height={28} className="mx-auto mb-2 text-texto-fraco" />

        <label className="cursor-pointer text-sm font-semibold text-marca-700 hover:underline dark:text-marca-400">
          Escolher do aparelho
          <input
            ref={input}
            type="file"
            name="fotos"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
            multiple
            className="sr-only"
            onChange={(e) =>
              setEscolhidas(Array.from(e.target.files ?? []).map((f) => f.name))
            }
          />
        </label>

        <p className="mt-1.5 text-xs leading-relaxed text-texto-suave">
          ou arraste aqui, ou copie uma imagem e aperte <kbd className="rounded border border-borda-forte px-1">Ctrl</kbd>
          +<kbd className="rounded border border-borda-forte px-1">V</kbd> em qualquer lugar
          desta página.
          <br />
          JPG, PNG ou WEBP · até 8 MB cada · até 10 por vez.
        </p>

        {escolhidas.length > 0 && (
          <ul className="mx-auto mt-4 max-w-sm space-y-1 text-left">
            {escolhidas.map((n) => (
              <li key={n} className="truncate text-xs text-texto">
                📎 {n}
              </li>
            ))}
          </ul>
        )}
      </div>

      {escolhidas.length > 0 && (
        <BotaoEnviar carregando="Enviando...">
          Enviar {escolhidas.length} foto{escolhidas.length > 1 ? "s" : ""}
        </BotaoEnviar>
      )}
    </form>
  );
}
