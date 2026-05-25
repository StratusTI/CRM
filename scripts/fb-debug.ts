/**
 * Diagnóstico descartável do Facebook: carrega a conexão salva, decifra o token
 * e pergunta ao Graph que tipo de token é + permissões concedidas + páginas.
 * Rodar: node --env-file=.env node_modules/.bin/tsx scripts/fb-debug.ts <workspaceSlug>
 */
import { createDecipheriv } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const GRAPH = "https://graph.facebook.com/v21.0";

function decrypt(payload: string): string {
  const key = Buffer.from(
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY ?? "",
    "base64",
  );
  const [iv, tag, data] = payload.split(".");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    d.update(Buffer.from(data, "base64")),
    d.final(),
  ]).toString("utf8");
}

async function show(label: string, url: string) {
  const res = await fetch(url);
  const json = await res.json();
  console.log(`\n=== ${label} (${res.status}) ===`);
  console.log(JSON.stringify(json, null, 2));
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const conn = await prisma.socialConnection.findFirst({
    where: { platform: "FACEBOOK" },
    orderBy: { updatedAt: "desc" },
  });
  if (!conn) {
    console.log("Nenhuma conexão FACEBOOK encontrada.");
    return;
  }
  const token = decrypt(conn.accessToken);
  console.log("externalAccountId (page id salvo):", conn.externalAccountId);
  console.log("accountName:", conn.accountName);
  console.log("token (prefixo):", `${token.slice(0, 12)}…`);

  await show("/me", `${GRAPH}/me?fields=id,name&access_token=${token}`);
  await show(
    "/me/permissions",
    `${GRAPH}/me/permissions?access_token=${token}`,
  );
  await show(
    "/me/accounts",
    `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${token}`,
  );
  await show(
    "debug_token",
    `${GRAPH}/debug_token?input_token=${token}&access_token=${token}`,
  );

  // Se houver Página acessível, sonda quais métricas de insights ainda são
  // válidas (a Meta vem descontinuando várias). Reporta OK/erro por métrica.
  const accounts = (await (
    await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${token}`,
    )
  ).json()) as { data?: { id: string; access_token?: string }[] };
  const page = accounts.data?.[0];
  if (page?.access_token) {
    const since = new Date(Date.now() - 8 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const until = new Date().toISOString().slice(0, 10);
    const candidates = [
      "page_impressions",
      "page_impressions_unique",
      "page_views_total",
      "page_post_engagements",
      "page_fan_adds",
      "page_daily_follows",
      "page_follows",
      "page_fans",
    ];
    console.log("\n=== probe de métricas de insights ===");
    for (const metric of candidates) {
      const res = await fetch(
        `${GRAPH}/${page.id}/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${page.access_token}`,
      );
      const body = (await res.json()) as {
        error?: { message?: string };
        data?: unknown[];
      };
      console.log(
        res.ok ? `OK   ${metric}` : `FAIL ${metric} → ${body.error?.message}`,
      );
    }
  } else {
    console.log("\n(sem Página acessível — pule o probe de métricas)");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
