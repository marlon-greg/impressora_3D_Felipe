import { z } from "zod";

/**
 * Validação do rascunho que chega do formulário.
 *
 * Mora fora de `acoes.ts` porque aquele arquivo é "use server" e só pode
 * exportar funções async — e porque assim dá para testar a regra sem subir
 * banco nem servidor.
 */

const num = z.coerce.number().refine(Number.isFinite, "Número inválido.");

/**
 * Campo numérico que aceita "não informado".
 *
 * Precisa ser `.nullish()` e NÃO uma união com `num` na frente: z.coerce.number()
 * converte null em 0 (porque Number(null) é 0), e a união devolveria 0 em vez de
 * null. Num campo qualquer isso seria feio; em `refugoManualPct` é grave — o motor
 * lê 0 como "taxa de refugo fixada em 0%" e desliga a reserva de quebra inteira,
 * entregando um preço sem nenhuma folga para a peça que sai errada.
 */
const numOuNulo = num.nullish().transform((v) => v ?? null);

export const esquema = z.object({
  nome: z.string().trim().min(2, "Dê um nome à peça."),
  descricao: z.string().trim().default(""),
  categoria: z.string().trim().default(""),

  larguraMm: numOuNulo,
  profundidadeMm: numOuNulo,
  alturaMm: numOuNulo,

  origemArquivo: z.enum(["PRONTO", "MODIFICADO", "DO_ZERO"]),
  custoArquivo: num.min(0),
  fonteArquivo: z.string().trim().default(""),

  printerId: z.union([z.string(), z.null()]).optional().transform((v) => v || null),
  horasImpressao: num.min(0, "Horas não podem ser negativas."),
  numeroPecas: num.int().min(1, "Ao menos uma parte."),
  horasPreparo: num.min(0),

  filamentos: z
    .array(
      z.object({
        materialId: z.string().min(1),
        gramas: num.min(0),
        desperdicioPct: num.min(0).max(100),
      }),
    )
    .default([]),
  materiais: z
    .array(z.object({ materialId: z.string().min(1), quantidade: num.min(0) }))
    .default([]),
  trabalhos: z
    .array(
      z.object({
        laborRateId: z.union([z.string(), z.null()]).optional().transform((v) => v || null),
        descricao: z.string().trim().default(""),
        horas: num.min(0),
        valorHora: num.min(0),
        antesDaImpressao: z.boolean(),
      }),
    )
    .default([]),

  precisaSuporte: z.boolean(),
  paredesFinas: z.boolean(),
  pecasMoveis: z.boolean(),
  multiCor: z.boolean(),
  encaixePreciso: z.boolean(),
  impressaoAlta: z.boolean(),
  refugoManualPct: numOuNulo,

  fazLixamento: z.boolean(),
  fazPrimer: z.boolean(),
  fazPintura: z.boolean(),
  fazVerniz: z.boolean(),
  fazMontagem: z.boolean(),

  modoMargem: z.enum(["MARKUP", "MARGEM_LIQUIDA"]),
  margemPct: num.min(0).max(1000),
  taxaCanalPct: num.min(0).max(99),
  taxaPagamentoPct: num.min(0).max(99),
  impostoPct: num.min(0).max(99),
  embalagemCusto: num.min(0),
  freteEmbutido: num.min(0),

  precoVendaAtual: numOuNulo,
  notas: z.string().trim().default(""),
});

export type RascunhoValidado = z.infer<typeof esquema>;
