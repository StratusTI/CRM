"use client";

import {
  Analytics01Icon,
  Cursor01Icon,
  EyeIcon,
  Megaphone01Icon,
  MoneyBag01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ResponsiveLine } from "@nivo/line";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  type GoogleAdsError,
  useGoogleAds,
} from "@/src/hooks/use-google-ads";
import type { GoogleAdsInsightsRange } from "@/src/schemas/google-ads.schema";
import {
  formatAxisLabel,
  getFortnightKey,
  toNivoSeries,
} from "./chart-utils";

const nf = new Intl.NumberFormat("pt-BR");
const nfCurrency = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCost(micros: number): string {
  return nfCurrency.format(micros / 1_000_000);
}

const CHART_THEME = {
  text: { fill: "currentColor", fontSize: 11 },
  axis: {
    ticks: { text: { fill: "currentColor" }, line: { stroke: "transparent" } },
    domain: { line: { stroke: "currentColor", strokeOpacity: 0.15 } },
  },
  grid: { line: { stroke: "currentColor", strokeOpacity: 0.08 } },
  tooltip: {
    container: {
      background: "var(--color-popover)",
      color: "var(--color-popover-foreground)",
      fontSize: 12,
    },
  },
} as const;

const RANGES: { value: GoogleAdsInsightsRange; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

const RECONNECT_CODES = new Set([
  "SOCIAL_CONNECTION_NOT_FOUND",
  "SOCIAL_SCOPE_MISSING",
  "SOCIAL_TOKEN_EXPIRED",
]);

function ErrorState({ error, slug }: { error: GoogleAdsError; slug: string }) {
  const needsReconnect = error.code && RECONNECT_CODES.has(error.code);
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <HugeiconsIcon
        icon={Megaphone01Icon}
        className="size-10 text-muted-foreground"
      />
      <p className="text-sm text-muted-foreground">{error.message}</p>
      {needsReconnect && (
        <Link
          href={`/settings?tab=social`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Reconectar Google Ads
        </Link>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  label: string;
  value: string;
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <HugeiconsIcon icon={icon} className="size-4" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-2xl font-semibold">{value}</span>
    </Card>
  );
}

export function GoogleAdsStudio({ slug }: { slug: string }) {
  const { overview, insights, range, setRange, isLoading, error } =
    useGoogleAds(slug);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} slug={slug} />;
  }

  const ctr =
    overview && overview.totals.impressions > 0
      ? ((overview.totals.clicks / overview.totals.impressions) * 100).toFixed(
          2,
        )
      : "0.00";

  const clicksData = insights
    ? (() => {
        const gk = range === "90d" ? getFortnightKey : null;
        return toNivoSeries(insights.series, (p) => p.clicks, gk);
      })()
    : null;

  const tickValues: string[] | number =
    clicksData && range === "90d"
      ? clicksData.map((d) => d.x)
      : range === "7d"
        ? 7
        : 6;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Megaphone01Icon}
            className="size-5 text-blue-500"
          />
          <div>
            <h2 className="text-lg font-semibold">Google Ads</h2>
            {overview?.customerName && (
              <p className="text-sm text-muted-foreground">
                {overview.customerName}
              </p>
            )}
          </div>
        </div>
        {overview && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {nf.format(overview.activeCampaigns)} campanha
            {overview.activeCampaigns !== 1 ? "s" : ""} ativa
            {overview.activeCampaigns !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {overview && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            icon={EyeIcon}
            label="Impressões (30d)"
            value={nf.format(overview.totals.impressions)}
          />
          <MetricCard
            icon={Cursor01Icon}
            label="Cliques (30d)"
            value={nf.format(overview.totals.clicks)}
          />
          <MetricCard
            icon={Analytics01Icon}
            label="CTR (30d)"
            value={`${ctr}%`}
          />
          <MetricCard
            icon={MoneyBag01Icon}
            label="Custo (30d)"
            value={`R$ ${formatCost(overview.totals.costMicros)}`}
          />
        </div>
      )}

      {insights && clicksData && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium">Cliques por período</span>
            <Tabs
              value={range}
              onValueChange={(v) => setRange(v as GoogleAdsInsightsRange)}
            >
              <TabsList className="h-7">
                {RANGES.map((r) => (
                  <TabsTrigger
                    key={r.value}
                    value={r.value}
                    className="h-6 px-2 text-xs"
                  >
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="h-56">
            <ResponsiveLine
              data={[{ id: "Cliques", data: clicksData }]}
              theme={CHART_THEME}
              margin={{ top: 8, right: 16, bottom: 32, left: 40 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: "auto", stacked: false }}
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                tickValues,
                format: (v) => formatAxisLabel(String(v)),
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickValues: 4,
                format: (v) => nf.format(Number(v)),
              }}
              enablePoints={false}
              enableGridX={false}
              curve="monotoneX"
              colors={["#3b82f6"]}
              lineWidth={2}
              useMesh
              enableCrosshair={false}
            />
          </div>
        </Card>
      )}

      {insights && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <MetricCard
            icon={EyeIcon}
            label={`Impressões (${range})`}
            value={nf.format(insights.totals.impressions)}
          />
          <MetricCard
            icon={Cursor01Icon}
            label={`Cliques (${range})`}
            value={nf.format(insights.totals.clicks)}
          />
          <MetricCard
            icon={Target01Icon}
            label={`Conversões (${range})`}
            value={nf.format(Math.round(insights.totals.conversions))}
          />
        </div>
      )}
    </div>
  );
}
