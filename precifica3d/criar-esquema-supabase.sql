-- ═══════════════════════════════════════════════════════════════
-- Precifica3D — criação do esquema no Supabase
--
-- Cole TUDO isto no SQL Editor do Supabase e execute uma vez.
-- Ao final, registra a migration na tabela de controle do Prisma,
-- para que um futuro `prisma migrate deploy` saiba que ela já foi
-- aplicada e não tente rodar de novo.
-- ═══════════════════════════════════════════════════════════════

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('DONO', 'ADMIN', 'OPERADOR', 'LEITOR');

-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('VERIFICAR_EMAIL', 'RESETAR_SENHA', 'CONVITE', 'TROCAR_EMAIL');

-- CreateEnum
CREATE TYPE "StatusEmail" AS ENUM ('PENDENTE', 'ENVIADO', 'FALHOU');

-- CreateEnum
CREATE TYPE "ModoMargem" AS ENUM ('MARKUP', 'MARGEM_LIQUIDA');

-- CreateEnum
CREATE TYPE "Tecnologia" AS ENUM ('FDM', 'RESINA');

-- CreateEnum
CREATE TYPE "Bandeira" AS ENUM ('VERDE', 'AMARELA', 'VERMELHA_1', 'VERMELHA_2');

-- CreateEnum
CREATE TYPE "CategoriaMaterial" AS ENUM ('FILAMENTO', 'TINTA', 'PRIMER', 'VERNIZ', 'MASSA', 'COLA', 'ABRASIVO', 'PINCEL', 'FERRAGEM', 'EMBALAGEM', 'OUTRO');

-- CreateEnum
CREATE TYPE "Unidade" AS ENUM ('G', 'ML', 'UN');

-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "TipoTrabalho" AS ENUM ('MODELAGEM', 'PREPARO', 'POS_PROCESSAMENTO', 'PINTURA', 'MONTAGEM', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusProjeto" AS ENUM ('RASCUNHO', 'PRODUZIDO', 'ANUNCIADO', 'VENDIDO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "OrigemArquivo" AS ENUM ('PRONTO', 'MODIFICADO', 'DO_ZERO');

-- CreateEnum
CREATE TYPE "TipoFoto" AS ENUM ('FABRICACAO', 'VENDA');

-- CreateEnum
CREATE TYPE "FonteMercado" AS ENUM ('CAMBIO', 'INDICE', 'LOJA', 'MARKETPLACE', 'MANUAL');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('PRECO_INSUMO_SUBIU', 'PRECO_INSUMO_CAIU', 'CAMBIO_VARIOU', 'MARGEM_BAIXA', 'PRECO_DESATUALIZADO', 'ESTOQUE_BAIXO', 'DADO_ESTIMADO', 'COLETA_FALHOU');

-- CreateEnum
CREATE TYPE "Gravidade" AS ENUM ('INFO', 'ATENCAO', 'CRITICO');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'OPERADOR',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalizado" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senhaHash" TEXT,
    "senhaAlteradaEm" TIMESTAMP(3),
    "precisaTrocarSenha" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificadoEm" TIMESTAMP(3),
    "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3),
    "superAdmin" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "ultimoAcessoEm" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUsoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "revogadaEm" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoToken" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT,
    "payload" TEXT,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 0,
    "janelaFim" TIMESTAMP(3) NOT NULL,
    "bloqueadoAte" TIMESTAMP(3),

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "acao" TEXT NOT NULL,
    "detalhe" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailQueue" (
    "id" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "texto" TEXT,
    "template" TEXT,
    "status" "StatusEmail" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "negocioNome" TEXT NOT NULL DEFAULT 'Ateliê 3D',
    "modoMargem" "ModoMargem" NOT NULL DEFAULT 'MARKUP',
    "margemPadraoPct" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "taxaCanalPadraoPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxaPagamentoPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impostoPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoIndiretoMensal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasProdutivasMes" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "embalagemPadrao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "tecnologia" "Tecnologia" NOT NULL DEFAULT 'FDM',
    "valorPago" DOUBLE PRECISION NOT NULL,
    "vidaUtilHoras" DOUBLE PRECISION NOT NULL DEFAULT 6000,
    "horasJaImpressas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manutencaoAnual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasUsoAnual" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "potenciaWatts" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "volumeX" DOUBLE PRECISION,
    "volumeY" DOUBLE PRECISION,
    "volumeZ" DOUBLE PRECISION,
    "bicoMm" DOUBLE PRECISION DEFAULT 0.4,
    "fotoUrl" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "camposEstimados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyTariff" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "valorConta" DOUBLE PRECISION NOT NULL,
    "consumoKwh" DOUBLE PRECISION NOT NULL,
    "distribuidora" TEXT,
    "bandeira" "Bandeira" NOT NULL DEFAULT 'VERDE',
    "ativa" BOOLEAN NOT NULL DEFAULT false,
    "estimado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "CategoriaMaterial" NOT NULL,
    "marca" TEXT,
    "tipoMaterial" TEXT,
    "cor" TEXT,
    "corHex" TEXT,
    "unidade" "Unidade" NOT NULL,
    "tamanhoEmbalagem" DOUBLE PRECISION NOT NULL,
    "precoEmbalagem" DOUBLE PRECISION NOT NULL,
    "rendimentoPecas" DOUBLE PRECISION,
    "estoqueAtual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estoqueMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fornecedor" TEXT,
    "diametroMm" DOUBLE PRECISION,
    "densidadeGcm3" DOUBLE PRECISION,
    "comprimentoM" DOUBLE PRECISION,
    "tempBico" INTEGER,
    "tempMesa" INTEGER,
    "atributos" JSONB,
    "precoEstimado" BOOLEAN NOT NULL DEFAULT false,
    "fotoUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "arquivadoEm" TIMESTAMP(3),
    "notas" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPurchase" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precoEmbalagem" DOUBLE PRECISION NOT NULL,
    "tamanhoEmbalagem" DOUBLE PRECISION NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "fornecedor" TEXT,
    "notas" TEXT,

    CONSTRAINT "MaterialPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "saldoApos" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT,
    "projectId" TEXT,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborRate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorHora" DOUBLE PRECISION NOT NULL,
    "cor" TEXT,
    "padraoPara" "TipoTrabalho",
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LaborRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT,
    "status" "StatusProjeto" NOT NULL DEFAULT 'RASCUNHO',
    "larguraMm" DOUBLE PRECISION,
    "profundidadeMm" DOUBLE PRECISION,
    "alturaMm" DOUBLE PRECISION,
    "origemArquivo" "OrigemArquivo" NOT NULL DEFAULT 'PRONTO',
    "custoArquivo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasModelagem" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fonteArquivo" TEXT,
    "printerId" TEXT,
    "horasImpressao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numeroPecas" INTEGER NOT NULL DEFAULT 1,
    "horasPreparo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precisaSuporte" BOOLEAN NOT NULL DEFAULT false,
    "paredesFinas" BOOLEAN NOT NULL DEFAULT false,
    "pecasMoveis" BOOLEAN NOT NULL DEFAULT false,
    "multiCor" BOOLEAN NOT NULL DEFAULT false,
    "encaixePreciso" BOOLEAN NOT NULL DEFAULT false,
    "impressaoAlta" BOOLEAN NOT NULL DEFAULT false,
    "refugoManualPct" DOUBLE PRECISION,
    "fazLixamento" BOOLEAN NOT NULL DEFAULT false,
    "fazPrimer" BOOLEAN NOT NULL DEFAULT false,
    "fazPintura" BOOLEAN NOT NULL DEFAULT false,
    "fazVerniz" BOOLEAN NOT NULL DEFAULT false,
    "fazMontagem" BOOLEAN NOT NULL DEFAULT false,
    "modoMargem" "ModoMargem",
    "margemPct" DOUBLE PRECISION,
    "taxaCanalPct" DOUBLE PRECISION,
    "taxaPagamentoPct" DOUBLE PRECISION,
    "impostoPct" DOUBLE PRECISION,
    "embalagemCusto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freteEmbutido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoVendaAtual" DOUBLE PRECISION,
    "precoDefinido" DOUBLE PRECISION,
    "notas" TEXT,
    "arquivadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFilament" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "gramas" DOUBLE PRECISION NOT NULL,
    "desperdicioPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notas" TEXT,

    CONSTRAINT "ProjectFilament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMaterial" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "notas" TEXT,

    CONSTRAINT "ProjectMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLabor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "laborRateId" TEXT,
    "descricao" TEXT NOT NULL,
    "horas" DOUBLE PRECISION NOT NULL,
    "valorHoraOverride" DOUBLE PRECISION,
    "antesDaImpressao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProjectLabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tipo" "TipoFoto" NOT NULL DEFAULT 'VENDA',
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "legenda" TEXT,
    "largura" INTEGER,
    "altura" INTEGER,
    "bytes" INTEGER,
    "capa" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "custoTotal" DOUBLE PRECISION NOT NULL,
    "precoMinimo" DOUBLE PRECISION NOT NULL,
    "precoIdeal" DOUBLE PRECISION NOT NULL,
    "precoPremium" DOUBLE PRECISION NOT NULL,
    "lucroIdeal" DOUBLE PRECISION NOT NULL,
    "margemRealPct" DOUBLE PRECISION NOT NULL,
    "ganhoPorHoraMaquina" DOUBLE PRECISION NOT NULL,
    "ganhoPorHoraHumana" DOUBLE PRECISION NOT NULL,
    "riscoScore" INTEGER NOT NULL DEFAULT 0,
    "detalhamento" JSONB NOT NULL,
    "contextoMercado" JSONB,

    CONSTRAINT "PricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "fonte" "FonteMercado" NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "unidade" TEXT,
    "meta" JSONB,
    "coletadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT true,
    "erro" TEXT,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketMaterialPrice" (
    "id" TEXT NOT NULL,
    "loja" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "tipoMaterial" TEXT,
    "marca" TEXT,
    "precoBRL" DOUBLE PRECISION NOT NULL,
    "pesoKg" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "precoPorKg" DOUBLE PRECISION NOT NULL,
    "url" TEXT,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "coletadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketMaterialPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketListingStat" (
    "id" TEXT NOT NULL,
    "termo" TEXT NOT NULL,
    "projectId" TEXT,
    "precoMin" DOUBLE PRECISION NOT NULL,
    "precoMedio" DOUBLE PRECISION NOT NULL,
    "precoMax" DOUBLE PRECISION NOT NULL,
    "precoMediana" DOUBLE PRECISION,
    "amostras" INTEGER NOT NULL,
    "coletadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketListingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketRun" (
    "id" TEXT NOT NULL,
    "fonte" "FonteMercado" NOT NULL,
    "coletor" TEXT NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),
    "sucesso" BOOLEAN NOT NULL DEFAULT false,
    "itens" INTEGER NOT NULL DEFAULT 0,
    "mensagem" TEXT,

    CONSTRAINT "MarketRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "gravidade" "Gravidade" NOT NULL DEFAULT 'INFO',
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "refTipo" TEXT,
    "refId" TEXT,
    "lidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Membership_workspaceId_idx" ON "Membership"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_key" ON "Membership"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailNormalizado_key" ON "User"("emailNormalizado");

-- CreateIndex
CREATE INDEX "User_emailNormalizado_idx" ON "User"("emailNormalizado");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiraEm_idx" ON "Session"("expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "VerificationToken_userId_tipo_idx" ON "VerificationToken"("userId", "tipo");

-- CreateIndex
CREATE INDEX "VerificationToken_expiraEm_idx" ON "VerificationToken"("expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_chave_key" ON "RateLimit"("chave");

-- CreateIndex
CREATE INDEX "RateLimit_janelaFim_idx" ON "RateLimit"("janelaFim");

-- CreateIndex
CREATE INDEX "AuditLog_userId_criadoEm_idx" ON "AuditLog"("userId", "criadoEm");

-- CreateIndex
CREATE INDEX "AuditLog_acao_criadoEm_idx" ON "AuditLog"("acao", "criadoEm");

-- CreateIndex
CREATE INDEX "EmailQueue_status_criadoEm_idx" ON "EmailQueue"("status", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_workspaceId_key" ON "Settings"("workspaceId");

-- CreateIndex
CREATE INDEX "Printer_workspaceId_idx" ON "Printer"("workspaceId");

-- CreateIndex
CREATE INDEX "EnergyTariff_workspaceId_ativa_idx" ON "EnergyTariff"("workspaceId", "ativa");

-- CreateIndex
CREATE INDEX "Material_workspaceId_categoria_idx" ON "Material"("workspaceId", "categoria");

-- CreateIndex
CREATE INDEX "Material_workspaceId_ativo_idx" ON "Material"("workspaceId", "ativo");

-- CreateIndex
CREATE INDEX "MaterialPurchase_materialId_data_idx" ON "MaterialPurchase"("materialId", "data");

-- CreateIndex
CREATE INDEX "StockMovement_workspaceId_criadoEm_idx" ON "StockMovement"("workspaceId", "criadoEm");

-- CreateIndex
CREATE INDEX "StockMovement_materialId_criadoEm_idx" ON "StockMovement"("materialId", "criadoEm");

-- CreateIndex
CREATE INDEX "LaborRate_workspaceId_idx" ON "LaborRate"("workspaceId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_status_idx" ON "Project"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Project_workspaceId_slug_key" ON "Project"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "ProjectFilament_projectId_idx" ON "ProjectFilament"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMaterial_projectId_idx" ON "ProjectMaterial"("projectId");

-- CreateIndex
CREATE INDEX "ProjectLabor_projectId_idx" ON "ProjectLabor"("projectId");

-- CreateIndex
CREATE INDEX "ProjectPhoto_projectId_tipo_idx" ON "ProjectPhoto"("projectId", "tipo");

-- CreateIndex
CREATE INDEX "PricingSnapshot_projectId_criadoEm_idx" ON "PricingSnapshot"("projectId", "criadoEm");

-- CreateIndex
CREATE INDEX "MarketSnapshot_fonte_chave_coletadoEm_idx" ON "MarketSnapshot"("fonte", "chave", "coletadoEm");

-- CreateIndex
CREATE INDEX "MarketSnapshot_chave_coletadoEm_idx" ON "MarketSnapshot"("chave", "coletadoEm");

-- CreateIndex
CREATE INDEX "MarketMaterialPrice_tipoMaterial_coletadoEm_idx" ON "MarketMaterialPrice"("tipoMaterial", "coletadoEm");

-- CreateIndex
CREATE INDEX "MarketMaterialPrice_loja_coletadoEm_idx" ON "MarketMaterialPrice"("loja", "coletadoEm");

-- CreateIndex
CREATE INDEX "MarketListingStat_termo_coletadoEm_idx" ON "MarketListingStat"("termo", "coletadoEm");

-- CreateIndex
CREATE INDEX "MarketRun_coletor_iniciadoEm_idx" ON "MarketRun"("coletor", "iniciadoEm");

-- CreateIndex
CREATE INDEX "Alert_workspaceId_lidoEm_criadoEm_idx" ON "Alert"("workspaceId", "lidoEm", "criadoEm");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyTariff" ADD CONSTRAINT "EnergyTariff_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPurchase" ADD CONSTRAINT "MaterialPurchase_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborRate" ADD CONSTRAINT "LaborRate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFilament" ADD CONSTRAINT "ProjectFilament_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFilament" ADD CONSTRAINT "ProjectFilament_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMaterial" ADD CONSTRAINT "ProjectMaterial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMaterial" ADD CONSTRAINT "ProjectMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLabor" ADD CONSTRAINT "ProjectLabor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLabor" ADD CONSTRAINT "ProjectLabor_laborRateId_fkey" FOREIGN KEY ("laborRateId") REFERENCES "LaborRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingSnapshot" ADD CONSTRAINT "PricingSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── controle de migrations do Prisma ──────────────────────────
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id                      VARCHAR(36) PRIMARY KEY NOT NULL,
    checksum                VARCHAR(64) NOT NULL,
    finished_at             TIMESTAMPTZ,
    migration_name          VARCHAR(255) NOT NULL,
    logs                    TEXT,
    rolled_back_at          TIMESTAMPTZ,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count     INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
VALUES
  (gen_random_uuid()::text, '37730d1c487fc3d951f2e26d2f245fedd4a1f12cafe6a6bc502aafd39d5d882c', now(), '20260827174230_inicial', now(), 1)
ON CONFLICT DO NOTHING;
