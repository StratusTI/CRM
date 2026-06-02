"use client";

import {
  EyeIcon,
  GoogleIcon,
  Pulse01Icon,
  UserMultipleIcon,
  WebDesign01Icon,
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
  type GoogleAnalyticsError,
  useGoogleAnalytics,
} from "@/src/hooks/use-google-analytics";
import type { GoogleAnalyticsInsightsRange } from "@/src/schemas/google-analytics.schema";

const nf = new Intl.NumberFormat("pt-BR");

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

const RANGES: { value: GoogleAnalyticsInsightsRange; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "28d", label: "28 dias" },
  { value: "90d", label: "90 dias" },
];

const RECONNECT_CODES = new Set([
  "SOCIAL_CONNECTION_NOT_FOUND",
  "SOCIAL_SCOPE_MISSING",
  "SOCIAL_TOKEN_EXPIRED",
  "SOCIAL_PROVIDER_NOT_CONFIGURED",
]);

function StatCard({
  icon,
  label,
  value,
}: {
  icon: typeof EyeIcon;
  label: string;
  value: number;
}) {
  return (
    <Card size="sm" className="gap-1 px-4 py-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <HugeiconsIcon icon={icon} className="size-3.5" />
        {label}
      </div>
      <span className="font-heading font-semibold text-2xl tabular-nums tracking-tight">
        {nf.format(value)}
      </span>
    </Card>
  );
}

function ReconnectNotice({
  slug,
  error,
}: {
  slug: string;
  error: GoogleAnalyticsError;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-muted-foreground">
        <HugeiconsIcon icon={GoogleIcon} className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Conecte o Google Analytics
        </h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Link href={`/${slug}/settings`} className={buttonVariants()}>
        Ir para configurações
      </Link>
    </div>
  );
}

export function GoogleAnalyticsStudio({ slug }: { slug: string }) {
  const { overview, insights, range, setRange, isLoading, error, refetch } =
    useGoogleAnalytics(slug);

  if (isLoading && !overview) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!overview && error && RECONNECT_CODES.has(error.code ?? "")) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <ReconnectNotice slug={slug} error={error} />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="px-4 py-6 text-center text-muted-foreground text-sm sm:px-6">
        {error?.message ?? "Não foi possível carregar a propriedade."}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={refetch}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const insightsNeedsReconnect =
    !insights && error && RECONNECT_CODES.has(error.code ?? "");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <HugeiconsIcon icon={GoogleIcon} className="size-7" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-heading font-semibold text-xl tracking-tight">
            {overview.propertyName}
          </h2>
          {overview.accountName ? (
            <p className="truncate text-muted-foreground text-sm">
              {overview.accountName}
            </p>
          ) : null}
        </div>
      </header>

      <Tabs defaultValue="overview">
        <div className="mb-6 border-b border-border/60">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={UserMultipleIcon}
              label="Usuários ativos (28d)"
              value={overview.totals.activeUsers}
            />
            <StatCard
              icon={Pulse01Icon}
              label="Sessões (28d)"
              value={overview.totals.sessions}
            />
            <StatCard
              icon={WebDesign01Icon}
              label="Páginas vistas (28d)"
              value={overview.totals.screenPageViews}
            />
            <StatCard
              icon={EyeIcon}
              label="Eventos (28d)"
              value={overview.totals.eventCount}
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading font-semibold text-lg tracking-tight">
              Análises
            </h3>
            <Tabs
              value={range}
              onValueChange={(v) => setRange(v as GoogleAnalyticsInsightsRange)}
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

          {insightsNeedsReconnect ? (
            <Card className="px-4 py-6 text-center text-muted-foreground text-sm">
              {error?.message}
            </Card>
          ) : insights ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <StatCard
                  icon={UserMultipleIcon}
                  label="Usuários ativos"
                  value={insights.totals.activeUsers}
                />
                <StatCard
                  icon={Pulse01Icon}
                  label="Sessões"
                  value={insights.totals.sessions}
                />
                <StatCard
                  icon={WebDesign01Icon}
                  label="Páginas vistas"
                  value={insights.totals.screenPageViews}
                />
                <StatCard
                  icon={EyeIcon}
                  label="Eventos"
                  value={insights.totals.eventCount}
                />
              </div>
              <Card className="h-72 p-2 text-muted-foreground">
                {insights.series.length > 0 ? (
                  <ResponsiveLine
                    data={[
                      {
                        id: "Usuários ativos",
                        data: insights.series.map((p) => ({
                          x: p.date,
                          y: p.activeUsers,
                        })),
                      },
                    ]}
                    margin={{ top: 16, right: 20, bottom: 48, left: 52 }}
                    colors={["#f97316"]}
                    curve="monotoneX"
                    enableArea
                    areaOpacity={0.12}
                    pointSize={4}
                    pointColor={{ from: "color" }}
                    useMesh
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: 0, max: "auto" }}
                    axisBottom={{
                      tickSize: 0,
                      tickPadding: 8,
                      tickRotation: -45,
                      tickValues: 6,
                    }}
                    axisLeft={{ tickSize: 0, tickPadding: 8 }}
                    theme={CHART_THEME}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm">
                    Sem dados no período.
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Skeleton className="h-72 w-full" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
