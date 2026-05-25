"use client";

import {
  Analytics01Icon,
  Facebook01Icon,
  FavouriteIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ResponsiveLine } from "@nivo/line";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type FacebookError, useFacebook } from "@/src/hooks/use-facebook";
import type { FacebookInsightsRange } from "@/src/schemas/facebook.schema";

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

const RANGES: { value: FacebookInsightsRange; label: string }[] = [
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
  icon: typeof FavouriteIcon;
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
  error: FacebookError;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-muted-foreground">
        <HugeiconsIcon icon={Facebook01Icon} className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Conecte o Facebook
        </h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Link href={`/${slug}/settings`} className={buttonVariants()}>
        Ir para configurações
      </Link>
    </div>
  );
}

export function FacebookStudio({ slug }: { slug: string }) {
  const {
    overview,
    insights,
    range,
    setRange,
    isLoading,
    error,
    refetch,
    publish,
  } = useFacebook(slug);

  if (isLoading && !overview) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3">
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
        {error?.message ?? "Não foi possível carregar a Página."}
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
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      {/* Cabeçalho da Página */}
      <header className="flex items-center gap-4">
        {overview.pictureUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do Facebook, sem host configurado em next/image
          <img
            src={overview.pictureUrl}
            alt={overview.name}
            className="size-16 rounded-full border border-border/70"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
            <HugeiconsIcon icon={Facebook01Icon} className="size-7" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-heading font-semibold text-xl tracking-tight">
            {overview.name}
          </h2>
          {overview.link ? (
            <a
              href={overview.link}
              target="_blank"
              rel="noreferrer"
              className="truncate text-muted-foreground text-sm hover:text-foreground"
            >
              Abrir Página
            </a>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={FavouriteIcon}
          label="Curtidas"
          value={overview.fanCount}
        />
        <StatCard
          icon={UserMultipleIcon}
          label="Seguidores"
          value={overview.followersCount}
        />
      </div>

      {/* Insights */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading font-semibold text-lg tracking-tight">
            Insights
          </h3>
          <Tabs
            value={range}
            onValueChange={(v) => setRange(v as FacebookInsightsRange)}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                icon={Analytics01Icon}
                label="Impressões"
                value={insights.totals.impressions}
              />
              <StatCard
                icon={FavouriteIcon}
                label="Engajamentos"
                value={insights.totals.engagements}
              />
              <StatCard
                icon={UserMultipleIcon}
                label="Novos fãs"
                value={insights.totals.fanAdds}
              />
            </div>
            <Card className="h-72 p-2 text-muted-foreground">
              {insights.series.length > 0 ? (
                <ResponsiveLine
                  data={[
                    {
                      id: "Impressões",
                      data: insights.series.map((p) => ({
                        x: p.date,
                        y: p.impressions,
                      })),
                    },
                    {
                      id: "Engajamentos",
                      data: insights.series.map((p) => ({
                        x: p.date,
                        y: p.engagements,
                      })),
                    },
                  ]}
                  margin={{ top: 16, right: 20, bottom: 64, left: 52 }}
                  colors={["#2563eb", "#22c55e"]}
                  curve="monotoneX"
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
                  legends={[
                    {
                      anchor: "bottom",
                      direction: "row",
                      translateY: 56,
                      itemWidth: 110,
                      itemHeight: 16,
                      symbolSize: 10,
                    },
                  ]}
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
      </section>

      {/* Publicar */}
      <PostComposer slug={slug} publish={publish} onPublished={refetch} />
    </div>
  );
}

function PostComposer({
  slug,
  publish,
  onPublished,
}: {
  slug: string;
  publish: ReturnType<typeof useFacebook>["publish"];
  onPublished: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    const message = (form.get("message") as string | null)?.trim() ?? "";
    const link = (form.get("link") as string | null)?.trim() ?? "";
    const image = form.get("image");
    const hasImage = image instanceof File && image.size > 0;
    if (!message && !link && !hasImage) {
      toast.error("Escreva uma mensagem, um link ou anexe uma imagem.");
      return;
    }
    // Não enviar campos vazios (o schema valida link como URL quando presente).
    if (!link) form.delete("link");
    if (!hasImage) form.delete("image");

    setSubmitting(true);
    const result = await publish(form);
    setSubmitting(false);

    if (result.ok) {
      toast.success("Publicado no Facebook.");
      formEl.reset();
      onPublished();
    } else if (RECONNECT_CODES.has(result.error.code ?? "")) {
      toast.error(
        `${result.error.message} Reconecte a conta em ${slug}/settings.`,
      );
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <section className="space-y-4">
      <h3 className="font-heading font-semibold text-lg tracking-tight">
        Publicar na Página
      </h3>
      <Card className="p-4 sm:p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="fb-message">Mensagem</Label>
            <Textarea
              id="fb-message"
              name="message"
              rows={4}
              maxLength={5000}
              placeholder="O que você quer publicar?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fb-link">Link (opcional)</Label>
              <Input
                id="fb-link"
                name="link"
                type="url"
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fb-image">Imagem (opcional)</Label>
              <Input id="fb-image" name="image" type="file" accept="image/*" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Com imagem, a publicação vira uma foto com a mensagem como legenda.
            Máximo 10 MB.
          </p>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
