import { CATEGORIAS, ORDEM_CATEGORIAS } from "@/core/materiais/categorias";
import { IconeBusca } from "@/components/ui/icones";

/**
 * Busca e filtro por formulário GET.
 *
 * Sem JavaScript no meio: o navegador monta a URL sozinho, o resultado é
 * linkável e volta certo no botão "voltar". Uma caixa de busca com debounce em
 * React daria a mesma tela e quebraria as três coisas.
 */
export function Filtros({
  q,
  categoria,
  estimados,
  arquivados,
  baixos,
}: {
  q: string;
  categoria: string;
  estimados: boolean;
  arquivados: boolean;
  baixos: boolean;
}) {
  return (
    <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <label htmlFor="q" className="mb-1.5 block text-xs font-medium text-texto-suave">
          Buscar
        </label>
        <div className="relative">
          <IconeBusca
            width={16}
            height={16}
            className="pointer-events-none absolute inset-y-0 left-3 my-auto text-texto-fraco"
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="nome, marca ou cor"
            className="w-full rounded-lg border border-borda-forte bg-superficie py-2.5 pl-9 pr-3 text-sm text-texto placeholder:text-texto-fraco focus:border-marca-600 focus:outline-none focus:ring-2 focus:ring-marca-600/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="categoria" className="mb-1.5 block text-xs font-medium text-texto-suave">
          Categoria
        </label>
        <select
          id="categoria"
          name="categoria"
          defaultValue={categoria}
          className="rounded-lg border border-borda-forte bg-superficie px-3 py-2.5 text-sm text-texto focus:border-marca-600 focus:outline-none focus:ring-2 focus:ring-marca-600/20"
        >
          <option value="">Todas</option>
          {ORDEM_CATEGORIAS.map((k) => (
            <option key={k} value={k}>
              {CATEGORIAS[k].icone} {CATEGORIAS[k].plural}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="rounded-lg border border-borda-forte bg-superficie px-4 py-2.5 text-sm font-semibold text-texto hover:bg-superficie-2"
      >
        Filtrar
      </button>

      <div className="flex flex-wrap gap-3">
        {[
          { nome: "baixos", ligado: baixos, rotulo: "Só os que acabaram" },
          { nome: "estimados", ligado: estimados, rotulo: "Só preço estimado" },
          { nome: "arquivados", ligado: arquivados, rotulo: "Ver arquivados" },
        ].map((f) => (
          <label
            key={f.nome}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-borda bg-superficie px-3 py-2.5 text-sm text-texto-suave hover:bg-superficie-2 has-checked:border-marca-600 has-checked:text-texto"
          >
            <input
              type="checkbox"
              name={f.nome}
              value="1"
              defaultChecked={f.ligado}
              className="h-4 w-4 rounded border-borda-forte text-marca-700 focus:ring-marca-600"
            />
            {f.rotulo}
          </label>
        ))}
      </div>
    </form>
  );
}
