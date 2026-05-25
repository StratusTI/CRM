import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import type {
  GoogleAnalyticsInsights,
  GoogleAnalyticsInsightsPoint,
  GoogleAnalyticsInsightsRange,
  GoogleAnalyticsOverview,
} from "@/src/schemas/google-analytics.schema";

/**
 * Cliente HTTP do Google Analytics 4, sobre um access token já fresco (o service
 * garante o frescor antes de chamar aqui). Cada função traduz a resposta crua do
 * Google para os DTOs do nosso contrato e converte qualquer falha em
 * `socialOauthFailed`, preservando o corpo do erro no log para diagnóstico.
 *
 * `propertyId` é a string no formato `properties/<id>` armazenada como
 * `externalAccountId` da conexão — é o identificador que o Data API exige.
 */

const DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const ADMIN_API = "https://analyticsadmin.googleapis.com/v1beta";

/** Log padronizado de falha de chamada à API do Google Analytics. */
async function logFailure(label: string, response: Response): Promise<void> {
  const body = await response.text().catch(() => "");
  console.error(`[ga] ${label} falhou`, response.status, body.slice(0, 500));
}

/** Inteiro a partir de string da API (Data API devolve métricas como string). */
function toInt(value: unknown): number {
  const n =
    typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Data UTC `YYYY-MM-DD` deslocada por `days` (negativo = no passado). */
function isoDate(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

type RunReportResponse = {
  rows?: {
    dimensionValues?: { value?: string }[];
    metricValues?: { value?: string }[];
  }[];
  totals?: { metricValues?: { value?: string }[] }[];
};

/** POST autenticado para `runReport` do Data API. */
async function runReport(
  accessToken: string,
  propertyId: string,
  body: object,
): Promise<Result<RunReportResponse>> {
  try {
    const response = await fetch(`${DATA_API}/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      await logFailure("runReport", response);
      return err(socialOauthFailed());
    }
    return ok((await response.json()) as RunReportResponse);
  } catch (error) {
    console.error("[ga] runReport erro de rede", error);
    return err(socialOauthFailed());
  }
}

/** Identidade da propriedade GA4 conectada (display name + conta-mãe). */
async function fetchPropertyIdentity(
  accessToken: string,
  propertyId: string,
): Promise<Result<{ propertyName: string; accountName: string | null }>> {
  try {
    const response = await fetch(`${ADMIN_API}/${propertyId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      await logFailure("property", response);
      return err(socialOauthFailed());
    }
    const json = (await response.json()) as {
      displayName?: string;
      account?: string;
    };

    // Busca o display name da conta-mãe (se houver) — opcional, só para mostrar
    // ao usuário.
    let accountName: string | null = null;
    if (json.account) {
      const accountResp = await fetch(`${ADMIN_API}/${json.account}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (accountResp.ok) {
        const accountJson = (await accountResp.json()) as {
          displayName?: string;
        };
        accountName = accountJson.displayName ?? null;
      }
    }

    return ok({
      propertyName: json.displayName ?? "Propriedade",
      accountName,
    });
  } catch (error) {
    console.error("[ga] property erro de rede", error);
    return err(socialOauthFailed());
  }
}

/** Visão da propriedade: identidade + totais da janela padrão (28d). */
export async function fetchOverview(
  accessToken: string,
  propertyId: string,
): Promise<Result<GoogleAnalyticsOverview>> {
  const identity = await fetchPropertyIdentity(accessToken, propertyId);
  if (!identity.ok) return identity;

  const report = await runReport(accessToken, propertyId, {
    dateRanges: [{ startDate: isoDate(-28), endDate: isoDate(-1) }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "eventCount" },
    ],
  });
  if (!report.ok) return report;

  const totalsRow = report.value.totals?.[0]?.metricValues ?? [];
  return ok({
    propertyId,
    propertyName: identity.value.propertyName,
    accountName: identity.value.accountName,
    totals: {
      activeUsers: toInt(totalsRow[0]?.value),
      sessions: toInt(totalsRow[1]?.value),
      screenPageViews: toInt(totalsRow[2]?.value),
      eventCount: toInt(totalsRow[3]?.value),
    },
  });
}

/** Analytics: totais da janela + série diária. */
export async function fetchInsights(
  accessToken: string,
  propertyId: string,
  args: {
    range: GoogleAnalyticsInsightsRange;
    startDate: string;
    endDate: string;
  },
): Promise<Result<GoogleAnalyticsInsights>> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "eventCount" },
    ],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });
  if (!report.ok) return report;

  const series: GoogleAnalyticsInsightsPoint[] = (report.value.rows ?? []).map(
    (row) => {
      const raw = row.dimensionValues?.[0]?.value ?? ""; // "YYYYMMDD"
      const date =
        raw.length === 8
          ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
          : raw;
      const m = row.metricValues ?? [];
      return {
        date,
        activeUsers: toInt(m[0]?.value),
        sessions: toInt(m[1]?.value),
        screenPageViews: toInt(m[2]?.value),
      };
    },
  );

  const totalsRow = report.value.totals?.[0]?.metricValues ?? [];
  return ok({
    range: args.range,
    startDate: args.startDate,
    endDate: args.endDate,
    totals: {
      activeUsers: toInt(totalsRow[0]?.value),
      sessions: toInt(totalsRow[1]?.value),
      screenPageViews: toInt(totalsRow[2]?.value),
      eventCount: toInt(totalsRow[3]?.value),
    },
    series,
  });
}
