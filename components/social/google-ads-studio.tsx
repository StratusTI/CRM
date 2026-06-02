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
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
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

function ReconnectNotice({ slug, error }: { error: GoogleAdsError; slug: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-muted-foreground">
        <HugeiconsIcon icon={Megaphone01Icon} className="size-6 text-blue-500" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Conecte o Google Ads
        </h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Link href={`/${slug}/settings`} className={buttonVariants()}>
        Ir para configurações
      </Link>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  label: string;
  value: string;
}) {
  return (
    <Card size="sm" className="gap-1 px-4 py-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <HugeiconsIcon icon={icon} className="size-3.5" />
        {label}
      </div>
      <span className="font-heading font-semibold text-2xl tabular-nums tracking-tight">
        {value}
      </span>
    </Card>
  );
}

export function GoogleAdsStudio({ slug }: { slug: string }) {
  const { overview, insights, range, setRange, isLoading, error, refetch } =
    useGoogleAds(slug);

  if (isLoading && !overview) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!overview && error) {
    return (
      <div className="px-4 py-6 sm:px-6">
        {RECONNECT_CODES.has(error.code ?? "") ? (
          <ReconnectNotice slug={slug} error={error} />
        ) : (
          <div className="text-center text-muted-foreground text-sm">
            {error.message}
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={refetch}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!overview) return null;

  const ctr =
    overview.totals.impressions > 0
      ? (
          (overview.totals.clicks / overview.totals.impressions) *
          100
        ).toFixed(2)
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
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
          <HugeiconsIcon icon={Megaphone01Icon} className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading font-semibold text-xl tracking-tight">
            Google Ads
          </h2>
          {overview.customerName && (
            <p className="truncate text-muted-foreground text-sm">
              {overview.customerName}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {nf.format(overview.activeCampaigns)} campanha
          {overview.activeCampaigns !== 1 ? "s" : ""} ativa
          {overview.activeCampaigns !== 1 ? "s" : ""}
        </span>
      </header>

      <Tabs defaultValue="overview">
        <div className="mb-6 border-b border-border/60">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              icon={EyeIcon}
              label="Impressões (30d)"
              value={nf.format(overview.totals.impressions)}
            />
            <StatCard
              icon={Cursor01Icon}
              label="Cliques (30d)"
              value={nf.format(overview.totals.clicks)}
            />
            <StatCard
              icon={Analytics01Icon}
              label="CTR (30d)"
              value={`${ctr}%`}
            />
            <StatCard
              icon={MoneyBag01Icon}
              label="Custo (30d)"
              value={`R$ ${formatCost(overview.totals.costMicros)}`}
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading font-semibold text-lg tracking-tight">
              Insights
            </h3>
            <Tabs
              value={range}
              onValueChange={(v) => setRange(v as GoogleAdsInsightsRange)}
            >
              <TabsList>
                {RANGES.map((r) => (
                  <TabsTrigger key={r.value} value={r.value}>
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {insights && clicksData ? (
            <>
              <Card className="p-4">
                <p className="mb-4 text-sm font-medium">Cliques por período</p>
                <div className="h-56">
                  <ResponsiveLine
                    data={[{ id: "Cliques", data: clicksData }]}
                    theme={CHART_THEME}
                    margin={{ top: 8, right: 16, bottom: 32, left: 40 }}
                    xScale={{ type: "point" }}
                    yScale={{
                      type: "linear",
                      min: 0,
                      max: "auto",
                      stacked: false,
                    }}
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard
                  icon={EyeIcon}
                  label={`Impressões (${range})`}
                  value={nf.format(insights.totals.impressions)}
                />
                <StatCard
                  icon={Cursor01Icon}
                  label={`Cliques (${range})`}
                  value={nf.format(insights.totals.clicks)}
                />
                <StatCard
                  icon={Target01Icon}
                  label={`Conversões (${range})`}
                  value={nf.format(Math.round(insights.totals.conversions))}
                />
              </div>
            </>
          ) : (
            <Skeleton className="h-72 w-full" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
