import { execSync } from "node:child_process";
import { config } from "dotenv";

// Carrega .env e aponta a conexão para o banco DEDICADO de testes,
// preservando o banco de desenvolvimento. Precisa rodar ANTES de qualquer
// import do Prisma — por isso o redirecionamento acontece no topo do módulo
// e o client só é importado dinamicamente nas funções abaixo.
config();

const TEST_DB = "nexo_test";
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "").replace(
  /\/[^/?]+(\?.*)?$/,
  `/${TEST_DB}$1`,
);

// Ordem importa: filhas antes das pais (CASCADE cobre, mas é explícito).
const TABLES = [
  "memberships",
  "accounts",
  "sessions",
  "verifications",
  "social_connections",
  "workspaces",
  "users",
];

/** Garante o schema no banco de testes (no-op quando já migrado). */
export async function ensureSchema(): Promise<void> {
  const { prisma } = await import("@/src/lib/prisma");
  const rows = await prisma.$queryRawUnsafe<{ regclass: string | null }[]>(
    "SELECT to_regclass('public.users')::text AS regclass",
  );
  if (!rows[0]?.regclass) {
    execSync("pnpm prisma migrate deploy", {
      stdio: "inherit",
      env: process.env,
    });
  }
}

/** Limpa todas as tabelas entre os testes. */
export async function truncateAll(): Promise<void> {
  const { prisma } = await import("@/src/lib/prisma");
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

export async function disconnect(): Promise<void> {
  const { prisma } = await import("@/src/lib/prisma");
  await prisma.$disconnect();
}
