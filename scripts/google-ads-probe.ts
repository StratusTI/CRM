/**
 * Sonda manual da descoberta de conta do Google Ads. Carrega a conexão real do
 * banco, decifra/renova o access token e bate nas mesmas APIs do fetchAccount,
 * imprimindo cada resposta CRUA (inclusive corpos de erro). Descartável.
 *
 *   npx tsx --env-file=.env scripts/google-ads-probe.ts
 */
import { GOOGLE_ADS_DEVELOPER_TOKEN } from "@/lib/env/_server";
import { prisma } from "@/src/lib/prisma";
import { decryptToken } from "@/src/lib/social/crypto";
import { googleAdsProvider } from "@/src/lib/social/providers/google-ads";

const BASE = "https://googleads.googleapis.com/v23";

async function main() {
  const conn = await prisma.socialConnection.findFirst({
    where: { platform: "GOOGLE_ADS" },
    orderBy: { updatedAt: "desc" },
  });
  if (!conn) {
    console.log(
      "Nenhuma conexão GOOGLE_ADS no banco (DATABASE_URL local não é o de produção?)",
    );
    return;
  }
  console.log("conexão:", {
    workspaceId: conn.workspaceId,
    externalAccountId: conn.externalAccountId,
    scope: conn.scope,
    expiresAt: conn.tokenExpiresAt,
  });

  // Mint de access token fresco (renova se preciso).
  let accessToken = decryptToken(conn.accessToken);
  const expired =
    conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() - 60_000 < Date.now();
  if (expired && conn.refreshToken) {
    const refreshed = await googleAdsProvider.refreshAccessToken!(
      decryptToken(conn.refreshToken),
    );
    if (!refreshed.ok) {
      console.log("falha ao renovar token:", refreshed.error);
      return;
    }
    accessToken = refreshed.value.accessToken;
    console.log("token renovado via refresh_token");
  }

  const devToken = GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
  const bearer = `Bearer ${accessToken}`;

  // 1) Contas acessíveis.
  const listRes = await fetch(`${BASE}/customers:listAccessibleCustomers`, {
    headers: { Authorization: bearer, "developer-token": devToken },
  });
  const listBody = await listRes.text();
  console.log("\n[1] listAccessibleCustomers", listRes.status, listBody);
  const rootIds: string[] = (() => {
    try {
      return (JSON.parse(listBody).resourceNames ?? []).map((r: string) =>
        r.replace("customers/", ""),
      );
    } catch {
      return [];
    }
  })();

  for (const rootId of rootIds) {
    // 2) Info da conta (manager?).
    const infoRes = await fetch(
      `${BASE}/customers/${rootId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization: bearer,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query:
            "SELECT customer.id, customer.descriptive_name, customer.manager, customer.test_account FROM customer LIMIT 1",
        }),
      },
    );
    console.log(
      `\n[2] customer ${rootId}`,
      infoRes.status,
      await infoRes.text(),
    );

    // 3) Sub-contas (a query que dava 400) — login-customer-id = a própria MCC.
    const clientsRes = await fetch(
      `${BASE}/customers/${rootId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization: bearer,
          "developer-token": devToken,
          "login-customer-id": rootId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query:
            "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.status, customer_client.level FROM customer_client WHERE customer_client.manager = FALSE LIMIT 50",
        }),
      },
    );
    console.log(
      `\n[3] customer_client de ${rootId}`,
      clientsRes.status,
      await clientsRes.text(),
    );
  }
}

main()
  .catch((e) => console.error("ERRO:", e))
  .finally(() => prisma.$disconnect());
