/**
 * Seed — dados reais do ateliê do Felipe.
 *
 * O que vem do arquivo que o Marlon passou (impressora, marcas, cores,
 * produtos) é fato. O que ele ainda não informou (preços, conta de luz,
 * valor/hora) entra com estimativa de mercado e `precoEstimado: true`,
 * para o sistema avisar na tela que aquele número precisa ser conferido.
 *
 * Rode com: npm run db:seed
 * É idempotente — pode rodar quantas vezes quiser.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashSenha } from "../src/server/auth/hash";
import { gerarSenhaForte } from "../src/core/validation/password";
import { normalizarEmail } from "../src/core/validation/email";
import type { CategoriaMaterial, Unidade } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Quem acessa ────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "marlonfanger@gmail.com";
const ADMIN_NOME = "Marlon";
const FELIPE_EMAIL = process.env.SEED_FELIPE_EMAIL ?? "felipe@exemplo.com.br";
const FELIPE_NOME = "Felipe";

/** Filamentos: PETG 1,75 mm, rolo de 1 kg, ~330 m — dado do Felipe. */
const MARCAS_PETG = ["Masterprint", "Easy Print", "Polyflow", "Volt3D"];
const CORES_MASTERPRINT = [
  { nome: "Preto", hex: "#1a1a1a" },
  { nome: "Rosa", hex: "#e8639b" },
  { nome: "Prata", hex: "#b8bcc0" },
  { nome: "Dourado", hex: "#c9a227" },
];

/** Tintas Acrilex — 12 cores; 9 potes de 37 ml e 1 de 250 ml. */
const CORES_TINTA = [
  { nome: "Azul claro", hex: "#7cb9e8" },
  { nome: "Azul escuro", hex: "#1f3a93" },
  { nome: "Amarelo", hex: "#f4d03f" },
  { nome: "Branco", hex: "#fafafa" },
  { nome: "Carmesim", hex: "#990033" },
  { nome: "Preto", hex: "#1a1a1a" },
  { nome: "Vermelho", hex: "#d62828" },
  { nome: "Verde", hex: "#2d8a3e" },
  { nome: "Nude", hex: "#e3bc9a" },
  { nome: "Marrom", hex: "#6b4423" },
  { nome: "Laranja", hex: "#e8791a" },
  { nome: "Roxo transparente", hex: "#7b4397" },
];

/**
 * Preços de referência (agosto/2026), marcados como estimados.
 * O PETG usa a mediana que o coletor de lojas realmente encontrou.
 */
const P = {
  petgKg: 109.9,
  tinta37: 7.5,
  tinta250: 28.0,
  pastaEmenda: 35.0,
  pastaModelagem: 32.0,
  primer: 45.0,
  verniz: 42.0,
  pincel: 12.0,
  lixa: 3.5,
  colaEpoxi: 18.0,
  embalagem: 3.5,
} as const;

async function main() {
  console.log("\n🌱 Semeando o Precifica3D...\n");

  // ── Workspace ────────────────────────────────────────────────
  const ws = await prisma.workspace.upsert({
    where: { slug: "atelie-felipe" },
    update: {},
    create: {
      nome: "Ateliê do Felipe",
      slug: "atelie-felipe",
      configuracao: {
        create: {
          negocioNome: "Ateliê do Felipe",
          modoMargem: "MARKUP",
          margemPadraoPct: 60,
          taxaCanalPadraoPct: 0,
          taxaPagamentoPct: 0,
          custoIndiretoMensal: 80,
          horasProdutivasMes: 60,
          embalagemPadrao: P.embalagem,
        },
      },
    },
  });
  console.log(`  ✓ Workspace: ${ws.nome}`);

  // ── Usuários ─────────────────────────────────────────────────
  const credenciais: { rotulo: string; email: string; senha: string; obs: string }[] = [];

  async function garantirUsuario(opcoes: {
    nome: string;
    email: string;
    papel: "DONO" | "ADMIN" | "OPERADOR";
    superAdmin?: boolean;
    provisoria: boolean;
    rotulo: string;
  }) {
    const existente = await prisma.user.findUnique({
      where: { emailNormalizado: normalizarEmail(opcoes.email) },
    });

    if (existente) {
      console.log(`  · Usuário ${opcoes.nome} já existe — senha preservada`);
      await prisma.membership.upsert({
        where: { userId_workspaceId: { userId: existente.id, workspaceId: ws.id } },
        update: { papel: opcoes.papel },
        create: { userId: existente.id, workspaceId: ws.id, papel: opcoes.papel },
      });
      return existente;
    }

    const senha = gerarSenhaForte(20);
    const u = await prisma.user.create({
      data: {
        nome: opcoes.nome,
        email: opcoes.email,
        emailNormalizado: normalizarEmail(opcoes.email),
        senhaHash: await hashSenha(senha),
        senhaAlteradaEm: new Date(),
        // o e-mail destes dois já nasce confirmado: são contas de partida,
        // criadas por quem administra, não auto-cadastro
        emailVerificadoEm: new Date(),
        precisaTrocarSenha: opcoes.provisoria,
        superAdmin: opcoes.superAdmin ?? false,
      },
    });

    await prisma.membership.create({
      data: { userId: u.id, workspaceId: ws.id, papel: opcoes.papel },
    });

    credenciais.push({
      rotulo: opcoes.rotulo,
      email: opcoes.email,
      senha,
      obs: opcoes.provisoria
        ? "PROVISÓRIA — o sistema exige troca no primeiro acesso"
        : "definitiva — troque quando quiser em Conta > Segurança",
    });

    return u;
  }

  await garantirUsuario({
    nome: ADMIN_NOME,
    email: ADMIN_EMAIL,
    papel: "DONO",
    superAdmin: true,
    provisoria: false,
    rotulo: "ADMIN (você)",
  });

  await garantirUsuario({
    nome: FELIPE_NOME,
    email: FELIPE_EMAIL,
    papel: "OPERADOR",
    provisoria: true,
    rotulo: "FELIPE",
  });

  // ── Impressora ───────────────────────────────────────────────
  const impressora = await prisma.printer.findFirst({
    where: { workspaceId: ws.id, nome: "Kobra X" },
  });

  const dadosImpressora = {
    workspaceId: ws.id,
    nome: "Kobra X",
    marca: "Anycubic",
    modelo: "Kobra X",
    tecnologia: "FDM" as const,
    valorPago: 2200,
    vidaUtilHoras: 6000,
    manutencaoAnual: 300,
    horasUsoAnual: 900,
    potenciaWatts: 180,
    volumeX: 220,
    volumeY: 220,
    volumeZ: 250,
    bicoMm: 0.4,
    notas:
      "Confirmar com o Felipe: valor pago, volume real de impressão e horas já rodadas. " +
      "Os números abaixo são estimativa de uma FDM com mesa aquecida desta faixa.",
    camposEstimados: [
      "valorPago",
      "vidaUtilHoras",
      "manutencaoAnual",
      "horasUsoAnual",
      "potenciaWatts",
      "volumeX",
      "volumeY",
      "volumeZ",
    ],
  };

  const printer = impressora
    ? await prisma.printer.update({ where: { id: impressora.id }, data: dadosImpressora })
    : await prisma.printer.create({ data: dadosImpressora });
  console.log(`  ✓ Impressora: ${printer.nome} (specs estimadas, marcadas para conferir)`);

  // ── Energia ──────────────────────────────────────────────────
  const tarifaExistente = await prisma.energyTariff.findFirst({
    where: { workspaceId: ws.id, ativa: true },
  });
  if (!tarifaExistente) {
    await prisma.energyTariff.create({
      data: {
        workspaceId: ws.id,
        referencia: "Estimativa inicial",
        valorConta: 180,
        consumoKwh: 190,
        bandeira: "AMARELA",
        ativa: true,
        estimado: true,
      },
    });
    console.log("  ✓ Tarifa de energia: R$ 0,95/kWh (ESTIMADA — lançar a conta real)");
  }

  // ── Mão de obra ──────────────────────────────────────────────
  const trabalhos = [
    { nome: "Modelagem 3D", valorHora: 45, padraoPara: "MODELAGEM" as const, cor: "#7c3aed" },
    { nome: "Preparo e fatiamento", valorHora: 25, padraoPara: "PREPARO" as const, cor: "#0891b2" },
    { nome: "Lixamento e acabamento", valorHora: 25, padraoPara: "POS_PROCESSAMENTO" as const, cor: "#ca8a04" },
    { nome: "Pintura", valorHora: 35, padraoPara: "PINTURA" as const, cor: "#dc2626" },
    { nome: "Montagem e colagem", valorHora: 28, padraoPara: "MONTAGEM" as const, cor: "#16a34a" },
  ];
  for (const t of trabalhos) {
    const ja = await prisma.laborRate.findFirst({ where: { workspaceId: ws.id, nome: t.nome } });
    if (!ja) await prisma.laborRate.create({ data: { ...t, workspaceId: ws.id } });
  }
  console.log(`  ✓ ${trabalhos.length} faixas de mão de obra (valores ESTIMADOS)`);

  // ── Materiais ────────────────────────────────────────────────
  interface Semente {
    nome: string;
    categoria: CategoriaMaterial;
    marca?: string;
    tipoMaterial?: string;
    cor?: string;
    corHex?: string;
    unidade: Unidade;
    tamanhoEmbalagem: number;
    precoEmbalagem: number;
    estoqueAtual: number;
    estoqueMinimo: number;
    rendimentoPecas?: number;
    diametroMm?: number;
    densidadeGcm3?: number;
    comprimentoM?: number;
    tempBico?: number;
    tempMesa?: number;
    atributos?: Record<string, unknown>;
    notas?: string;
  }

  const sementes: Semente[] = [];

  // Filamento — 4 rolos Masterprint confirmados, nas cores informadas
  for (const cor of CORES_MASTERPRINT) {
    sementes.push({
      nome: `PETG Masterprint ${cor.nome}`,
      categoria: "FILAMENTO",
      marca: "Masterprint",
      tipoMaterial: "PETG",
      cor: cor.nome,
      corHex: cor.hex,
      unidade: "G",
      tamanhoEmbalagem: 1000,
      precoEmbalagem: P.petgKg,
      estoqueAtual: 1000, // 1 rolo cheio de cada
      estoqueMinimo: 250,
      diametroMm: 1.75,
      densidadeGcm3: 1.27,
      comprimentoM: 330,
      tempBico: 240,
      tempMesa: 80,
    });
  }

  // Demais marcas que ele usa, sem cor definida e sem estoque lançado
  for (const marca of MARCAS_PETG.filter((m) => m !== "Masterprint")) {
    sementes.push({
      nome: `PETG ${marca}`,
      categoria: "FILAMENTO",
      marca,
      tipoMaterial: "PETG",
      unidade: "G",
      tamanhoEmbalagem: 1000,
      precoEmbalagem: P.petgKg,
      estoqueAtual: 0,
      estoqueMinimo: 250,
      diametroMm: 1.75,
      densidadeGcm3: 1.27,
      comprimentoM: 330,
      tempBico: 240,
      tempMesa: 80,
      notas: "Marca que o Felipe já usou. Ajustar preço e estoque conforme a compra.",
    });
  }

  // Tintas Acrilex — 9 potes de 37 ml distribuídos entre as 12 cores
  CORES_TINTA.forEach((cor, i) => {
    sementes.push({
      nome: `Acrilex ${cor.nome} 37ml`,
      categoria: "TINTA",
      marca: "Acrilex",
      tipoMaterial: "Acrílica base água",
      cor: cor.nome,
      corHex: cor.hex,
      unidade: "ML",
      tamanhoEmbalagem: 37,
      precoEmbalagem: P.tinta37,
      estoqueAtual: i < 9 ? 37 : 0, // 9 potes confirmados
      estoqueMinimo: 10,
      atributos: { acabamento: "fosco" },
    });
  });

  sementes.push({
    nome: "Acrilex Branco 250ml",
    categoria: "TINTA",
    marca: "Acrilex",
    tipoMaterial: "Acrílica base água",
    cor: "Branco",
    corHex: "#fafafa",
    unidade: "ML",
    tamanhoEmbalagem: 250,
    precoEmbalagem: P.tinta250,
    estoqueAtual: 250,
    estoqueMinimo: 50,
    atributos: { acabamento: "fosco" },
    notas: "Confirmar com o Felipe se o pote de 250 ml é tinta Acrilex ou outro produto da linha.",
  });

  // Massas
  sementes.push(
    {
      nome: "Pasta para emendas 250ml",
      categoria: "MASSA",
      tipoMaterial: "Massa acrílica com cargas minerais",
      unidade: "ML",
      tamanhoEmbalagem: 250,
      precoEmbalagem: P.pastaEmenda,
      estoqueAtual: 250,
      estoqueMinimo: 50,
      atributos: { finalidade: "esconder emendas na colagem das peças" },
    },
    {
      nome: "Pasta de modelagem 250ml",
      categoria: "MASSA",
      tipoMaterial: "Resina acrílica + carbonato de cálcio",
      unidade: "ML",
      tamanhoEmbalagem: 250,
      precoEmbalagem: P.pastaModelagem,
      estoqueAtual: 250,
      estoqueMinimo: 50,
      atributos: { finalidade: "texturas e volumes sobre a peça" },
    },
  );

  // Preparação e proteção
  sementes.push(
    {
      nome: "Primer",
      categoria: "PRIMER",
      tipoMaterial: "Resina + pigmento fosco",
      unidade: "ML",
      tamanhoEmbalagem: 400,
      precoEmbalagem: P.primer,
      estoqueAtual: 400,
      estoqueMinimo: 100,
      atributos: { apresentacao: "a confirmar (spray ou pote)" },
      notas: "Confirmar marca e apresentação com o Felipe.",
    },
    {
      nome: "Verniz",
      categoria: "VERNIZ",
      tipoMaterial: "Resina acrílica transparente",
      unidade: "ML",
      tamanhoEmbalagem: 400,
      precoEmbalagem: P.verniz,
      estoqueAtual: 400,
      estoqueMinimo: 100,
      atributos: { apresentacao: "a confirmar (spray ou pote)", acabamento: "a definir" },
      notas: "Confirmar marca, apresentação e se é fosco, acetinado ou brilhante.",
    },
  );

  // Pincéis e consumíveis
  sementes.push(
    {
      nome: "Pincel Condor",
      categoria: "PINCEL",
      marca: "Condor",
      unidade: "UN",
      tamanhoEmbalagem: 1,
      precoEmbalagem: P.pincel,
      estoqueAtual: 5,
      estoqueMinimo: 2,
      rendimentoPecas: 80, // um pincel dura ~80 peças
      atributos: { tipoCerda: "a confirmar", formato: "a confirmar" },
    },
    {
      nome: "Lixa d'água (folha)",
      categoria: "ABRASIVO",
      unidade: "UN",
      tamanhoEmbalagem: 1,
      precoEmbalagem: P.lixa,
      estoqueAtual: 10,
      estoqueMinimo: 4,
      rendimentoPecas: 4,
    },
    {
      nome: "Cola epóxi",
      categoria: "COLA",
      unidade: "ML",
      tamanhoEmbalagem: 50,
      precoEmbalagem: P.colaEpoxi,
      estoqueAtual: 50,
      estoqueMinimo: 15,
    },
    {
      nome: "Embalagem (caixa + bolha + etiqueta)",
      categoria: "EMBALAGEM",
      unidade: "UN",
      tamanhoEmbalagem: 1,
      precoEmbalagem: P.embalagem,
      estoqueAtual: 20,
      estoqueMinimo: 5,
    },
  );

  let criados = 0;
  for (const s of sementes) {
    const ja = await prisma.material.findFirst({
      where: { workspaceId: ws.id, nome: s.nome },
    });
    if (ja) continue;

    const { estoqueAtual, atributos, ...resto } = s;
    const material = await prisma.material.create({
      data: {
        ...resto,
        workspaceId: ws.id,
        estoqueAtual: 0,
        precoEstimado: true,
        atributos: atributos as never,
      },
    });

    // estoque inicial entra como movimentação, nunca como número solto —
    // assim o extrato explica de onde veio cada unidade
    if (estoqueAtual > 0) {
      await prisma.$transaction([
        prisma.stockMovement.create({
          data: {
            workspaceId: ws.id,
            materialId: material.id,
            tipo: "ENTRADA",
            quantidade: estoqueAtual,
            saldoApos: estoqueAtual,
            motivo: "Estoque inicial informado no cadastro",
          },
        }),
        prisma.material.update({
          where: { id: material.id },
          data: { estoqueAtual },
        }),
        prisma.materialPurchase.create({
          data: {
            materialId: material.id,
            precoEmbalagem: s.precoEmbalagem,
            tamanhoEmbalagem: s.tamanhoEmbalagem,
            quantidade: estoqueAtual / s.tamanhoEmbalagem,
            notas: "Preço estimado no seed — corrigir com a nota fiscal real",
          },
        }),
      ]);
    }
    criados++;
  }
  console.log(`  ✓ ${criados} materiais cadastrados (todos com preço ESTIMADO)`);

  // ── Alerta inicial ───────────────────────────────────────────
  const jaAvisado = await prisma.alert.findFirst({
    where: { workspaceId: ws.id, tipo: "DADO_ESTIMADO" },
  });
  if (!jaAvisado) {
    await prisma.alert.create({
      data: {
        workspaceId: ws.id,
        tipo: "DADO_ESTIMADO",
        gravidade: "ATENCAO",
        titulo: "Confira os preços antes de confiar no cálculo",
        mensagem:
          "Os preços dos materiais, a conta de luz e o valor/hora entraram como estimativa de mercado. " +
          "O cálculo já funciona, mas só fica confiável depois que você corrigir com os valores reais. " +
          "Os campos estimados aparecem destacados nas telas.",
      },
    });
  }

  // ── Credenciais ──────────────────────────────────────────────
  if (credenciais.length > 0) {
    console.log("\n" + "═".repeat(66));
    console.log("  CREDENCIAIS DE ACESSO — anote agora, não aparecem de novo");
    console.log("═".repeat(66));
    for (const c of credenciais) {
      console.log(`\n  ${c.rotulo}`);
      console.log(`    e-mail: ${c.email}`);
      console.log(`    senha:  ${c.senha}`);
      console.log(`    ${c.obs}`);
    }
    console.log("\n" + "═".repeat(66));
    console.log("  Guarde em gerenciador de senhas e apague do histórico do terminal.");
    console.log("═".repeat(66) + "\n");
  } else {
    console.log("\n  · Usuários já existiam — nenhuma senha nova foi gerada.\n");
  }

  console.log("🌱 Pronto.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed falhou:\n", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
