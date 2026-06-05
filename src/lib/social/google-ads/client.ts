import { GOOGLE_ADS_DEVELOPER_TOKEN } from "@/lib/env/_server";
import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import type {
  GoogleAdsInsights,
  GoogleAdsInsightsPoint,
  GoogleAdsInsightsRange,
  GoogleAdsOverview,
} from "@/src/schemas/google-ads.schema";
import { GOOGLE_ADS_RANGE_DAYS } from "@/src/schemas/google-ads.schema";

const BASE = "https://googleads.googleapis.com/v18";

async function logFailure(label: string, response: Response): Promise<void> {
  const body = await response.text().catch(() => "");
  console.error(
    `[google-ads] ${label} falhou`,
    response.status,
    body.slice(0, 500),
  );
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
    "Content-Type": "application/json",
  };
}

/** Data UTC `YYYY-MM-DD` deslocada por `days` (negativo = no passado). */
function isoDate(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Inteiro a partir de string da API (Google Ads devolve métricas como string). */
function toInt(v: unknown): number {
  const n = typeof v === "string" ? Number.parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toFloat(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type SearchResponse = {
  results?: {
    customer?: {
      id?: string;
      descriptiveName?: string;
      currencyCode?: string;
    };
    campaign?: { id?: string; name?: string; status?: string };
    metrics?: {
      impressions?: string;
      clicks?: string;
      costMicros?: string;
      conversions?: string;
      ctr?: string;
    };
    segments?: { date?: string };
  }[];
};

/** POST GAQL para a Google Ads API. */
async function gaqlSearch(
  customerId: string,
  accessToken: string,
  query: string,
): Promise<Result<SearchResponse>> {
  const response = await fetch(
    `${BASE}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ query }),
    },
  ).catch((e) => {
    console.error("[google-ads] search erro de rede", e);
    return null;
  });

  if (!response) return err(socialOauthFailed());
  if (!response.ok) {
    await logFailure("search", response);
    return err(socialOauthFailed());
  }

  return ok((await response.json()) as SearchResponse);
}

/** Visão geral da conta: totais dos últimos 30d + contagem de campanhas ativas. */
export async function fetchOverview(
  accessToken: string,
  customerId: string,
): Promise<Result<GoogleAdsOverview>> {
  const startDate = isoDate(-30);
  const endDate = isoDate(-1);

  const [totalsRes, nameRes] = await Promise.all([
    gaqlSearch(
      customerId,
      accessToken,
      `SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr
      FROM customer
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`,
    ),
    gaqlSearch(
      customerId,
      accessToken,
      `SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code
      FROM customer LIMIT 1`,
    ),
  ]);

  if (!totalsRes.ok) return totalsRes;
  if (!nameRes.ok) return nameRes;

  const m = totalsRes.value.results?.[0]?.metrics;
  const customer = nameRes.value.results?.[0]?.customer;

  // Conta campanhas ativas.
  const campaignsRes = await gaqlSearch(
    customerId,
    accessToken,
    `SELECT campaign.id FROM campaign WHERE campaign.status = 'ENABLED'`,
  );
  const activeCampaigns = campaignsRes.ok
    ? (campaignsRes.value.results?.length ?? 0)
    : 0;

  return ok({
    customerId,
    customerName: customer?.descriptiveName ?? null,
    currency: customer?.currencyCode ?? "BRL",
    totals: {
      impressions: toInt(m?.impressions),
      clicks: toInt(m?.clicks),
      costMicros: toFloat(m?.costMicros),
      conversions: toFloat(m?.conversions),
      ctr: toFloat(m?.ctr),
    },
    activeCampaigns,
  });
}

/** Série diária de métricas de campanhas para o período pedido. */
export async function fetchInsights(
  accessToken: string,
  customerId: string,
  range: GoogleAdsInsightsRange,
): Promise<Result<GoogleAdsInsights>> {
  const days = GOOGLE_ADS_RANGE_DAYS[range];
  const startDate = isoDate(-days);
  const endDate = isoDate(-1);

  const result = await gaqlSearch(
    customerId,
    accessToken,
    `SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date ASC`,
  );
  if (!result.ok) return result;

  // Agrega por data (múltiplas campanhas no mesmo dia somam).
  const byDate = new Map<string, GoogleAdsInsightsPoint>();
  for (const row of result.value.results ?? []) {
    const date = row.segments?.date ?? "";
    if (!date) continue;
    const prev = byDate.get(date) ?? {
      date,
      impressions: 0,
      clicks: 0,
      costMicros: 0,
      conversions: 0,
    };
    byDate.set(date, {
      date,
      impressions: prev.impressions + toInt(row.metrics?.impressions),
      clicks: prev.clicks + toInt(row.metrics?.clicks),
      costMicros: prev.costMicros + toFloat(row.metrics?.costMicros),
      conversions: prev.conversions + toFloat(row.metrics?.conversions),
    });
  }

  const series = Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const totals = series.reduce(
    (acc, p) => ({
      impressions: acc.impressions + p.impressions,
      clicks: acc.clicks + p.clicks,
      costMicros: acc.costMicros + p.costMicros,
      conversions: acc.conversions + p.conversions,
    }),
    { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 },
  );

  return ok({ range, startDate, endDate, totals, series });
}
