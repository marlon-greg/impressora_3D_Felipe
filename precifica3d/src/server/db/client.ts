import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Client do Prisma, instância única.
 *
 * Em desenvolvimento o hot-reload recarrega os módulos a cada save; sem o
 * cache no globalThis, cada recarga abriria um pool novo e o Postgres
 * derrubaria a conexão por excesso.
 *
 * Em produção (Supabase free) o limite de conexões é baixo, então a
 * DATABASE_URL precisa apontar para o pooler (porta 6543, pgbouncer),
 * não para a conexão direta. Está documentado no README.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criar(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não definida — o banco não pode ser alcançado.");
  }

  const adapter = new PrismaPg({
    connectionString,
    // serverless abre e fecha instância o tempo todo; pool pequeno evita
    // estourar o limite do plano gratuito do Supabase
    max: process.env.NODE_ENV === "production" ? 5 : 10,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? criar();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
