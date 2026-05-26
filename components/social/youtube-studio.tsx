"use client";

import {
  Album02Icon,
  EyeIcon,
  UserMultipleIcon,
  Video01Icon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useYoutube, type YoutubeError } from "@/src/hooks/use-youtube";
import type { YoutubeInsightsRange } from "@/src/schemas/youtube.schema";

const nf = new Intl.NumberFormat("pt-BR");

/** Tema nivo que herda a cor do texto do container (claro/escuro). */
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

const RANGES: { value: YoutubeInsightsRange; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "28d", label: "28 dias" },
  { value: "90d", label: "90 dias" },
  { value: "365d", label: "1 ano" },
];

/** Códigos que significam "precisa (re)conectar a conta nas configurações". */
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

/** Estado de erro que orienta o usuário a reconectar a conta em Settings. */
function ReconnectNotice({
  slug,
  error,
}: {
  slug: string;
  error: YoutubeError;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-muted-foreground">
        <HugeiconsIcon icon={Video01Icon} className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Conecte o YouTube
        </h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Link href={`/${slug}/settings`} className={buttonVariants()}>
        Ir para configurações
      </Link>
    </div>
  );
}

export function YoutubeStudio({ slug }: { slug: string }) {
  const {
    overview,
    insights,
    range,
    setRange,
    isLoading,
    error,
    refetch,
    publish,
  } = useYoutube(slug);

  if (isLoading && !overview) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  // Sem overview + erro de (re)conexão → orienta para Settings.
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
        {error?.message ?? "Não foi possível carregar o canal."}
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
      {/* Cabeçalho do canal */}
      <header className="flex items-center gap-4">
        {overview.thumbnailUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do YouTube, sem host configurado em next/image
          <img
            src={overview.thumbnailUrl}
            alt={overview.title}
            className="size-16 rounded-full border border-border/70"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-red-600/10 text-red-600">
            <HugeiconsIcon icon={Video01Icon} className="size-7" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-heading font-semibold text-xl tracking-tight">
            {overview.title}
          </h2>
          {overview.customUrl ? (
            <p className="truncate text-muted-foreground text-sm">
              {overview.customUrl}
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon={UserMultipleIcon}
          label="Inscritos"
          value={overview.subscriberCount}
        />
        <StatCard
          icon={EyeIcon}
          label="Visualizações"
          value={overview.viewCount}
        />
        <StatCard
          icon={Album02Icon}
          label="Vídeos"
          value={overview.videoCount}
        />
      </div>

      {/* Analytics */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading font-semibold text-lg tracking-tight">
            Análises
          </h3>
          <Tabs
            value={range}
            onValueChange={(v) => setRange(v as YoutubeInsightsRange)}
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
                icon={EyeIcon}
                label="Visualizações no período"
                value={insights.totals.views}
              />
              <StatCard
                icon={Video01Icon}
                label="Minutos assistidos"
                value={insights.totals.estimatedMinutesWatched}
              />
              <StatCard
                icon={UserMultipleIcon}
                label="Inscritos ganhos"
                value={insights.totals.subscribersGained}
              />
            </div>
            <Card className="h-72 p-2 text-muted-foreground">
              {insights.series.length > 0 ? (
                <ResponsiveLine
                  data={[
                    {
                      id: "Visualizações",
                      data: insights.series.map((p) => ({
                        x: p.date,
                        y: p.views,
                      })),
                    },
                  ]}
                  margin={{ top: 16, right: 20, bottom: 48, left: 52 }}
                  colors={["#ef4444"]}
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
      </section>

      {/* Publicar */}
      <UploadForm slug={slug} publish={publish} onPublished={refetch} />
    </div>
  );
}

function UploadForm({
  slug,
  publish,
  onPublished,
}: {
  slug: string;
  publish: ReturnType<typeof useYoutube>["publish"];
  onPublished: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Selecione um arquivo de vídeo.");
      return;
    }

    setSubmitting(true);
    const result = await publish(form);
    setSubmitting(false);

    if (result.ok) {
      toast.success("Vídeo enviado para o YouTube.");
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
        Publicar vídeo
      </h3>
      <Card className="p-4 sm:p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="yt-title">Título</Label>
            <Input
              id="yt-title"
              name="title"
              maxLength={100}
              required
              placeholder="Título do vídeo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="yt-description">Descrição</Label>
            <Textarea
              id="yt-description"
              name="description"
              rows={4}
              maxLength={5000}
              placeholder="Descrição (opcional)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="yt-privacy">Visibilidade</Label>
              <Select name="privacyStatus" defaultValue="private">
                <SelectTrigger id="yt-privacy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privado</SelectItem>
                  <SelectItem value="unlisted">Não listado</SelectItem>
                  <SelectItem value="public">Público</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yt-tags">Tags</Label>
              <Input
                id="yt-tags"
                name="tags"
                placeholder="separadas por vírgula"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="yt-file">Arquivo de vídeo</Label>
            <Input
              id="yt-file"
              name="file"
              type="file"
              accept="video/*"
              required
            />
            <p className="text-muted-foreground text-xs">
              Máximo 256 MB. O vídeo entra como privado por padrão.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Publicar no YouTube"}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
