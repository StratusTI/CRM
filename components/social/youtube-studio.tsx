"use client";

import {
  Album02Icon,
  EyeIcon,
  FavouriteIcon,
  Share08Icon,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useYoutube, type YoutubeError } from "@/src/hooks/use-youtube";
import type { YoutubeInsightsRange } from "@/src/schemas/youtube.schema";
import type { YoutubeVideo } from "@/src/schemas/youtube.schema";

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

const RANGES: { value: YoutubeInsightsRange; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "28d", label: "28 dias" },
  { value: "90d", label: "90 dias" },
  { value: "365d", label: "1 ano" },
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

function YoutubeVideoPreview({
  channelTitle,
  channelThumbnailUrl,
  title,
  privacyStatus,
}: {
  channelTitle: string;
  channelThumbnailUrl?: string | null;
  title: string;
  privacyStatus: string;
}) {
  const privacyLabel =
    privacyStatus === "public"
      ? "Público"
      : privacyStatus === "unlisted"
        ? "Não listado"
        : "Privado";

  return (
    <div className="mx-auto max-w-[380px] overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      {/* Thumbnail placeholder 16:9 */}
      <div className="relative aspect-video w-full bg-muted">
        <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground/30">
          <HugeiconsIcon icon={Video01Icon} className="size-10" />
          <span className="text-xs">Miniatura do vídeo</span>
        </div>
        <div className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-white text-xs">
          0:00
        </div>
      </div>

      {/* Metadata */}
      <div className="flex gap-3 p-3">
        {channelThumbnailUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do YouTube
          <img
            src={channelThumbnailUrl}
            alt={channelTitle}
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-600/10 text-red-600">
            <HugeiconsIcon icon={Video01Icon} className="size-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {title ? (
            <p className="line-clamp-2 font-semibold text-sm leading-snug">
              {title}
            </p>
          ) : (
            <p className="text-muted-foreground/50 text-sm italic">
              Título do vídeo…
            </p>
          )}
          <p className="mt-0.5 text-muted-foreground text-xs">{channelTitle}</p>
          <p className="text-muted-foreground text-xs">
            0 visualizações · {privacyLabel}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-border/60 px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={FavouriteIcon} className="size-4" />
          Gostei
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Share08Icon} className="size-4" />
          Compartilhar
        </button>
      </div>
    </div>
  );
}

function YoutubeVideoModal({
  video,
  channelTitle,
  channelThumbnailUrl,
}: {
  video: YoutubeVideo;
  channelTitle: string;
  channelThumbnailUrl?: string | null;
}) {
  const date = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="overflow-hidden rounded-xl">
      <div className="relative aspect-video w-full bg-neutral-950">
        {video.thumbnailUrl ? (
          // biome-ignore lint/performance/noImgElement: thumbnail externa do YouTube
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-white/20">
            <HugeiconsIcon icon={Video01Icon} className="size-14" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-600 shadow-lg">
            <HugeiconsIcon icon={Video01Icon} className="size-7 text-white" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <h3 className="font-heading font-semibold text-base leading-snug tracking-tight">
          {video.title}
        </h3>

        <div className="flex items-center gap-3">
          {channelThumbnailUrl ? (
            // biome-ignore lint/performance/noImgElement: avatar externo do YouTube
            <img
              src={channelThumbnailUrl}
              alt={channelTitle}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-600/10 text-red-600">
              <HugeiconsIcon icon={Video01Icon} className="size-4" />
            </div>
          )}
          <div>
            <p className="font-medium text-sm">{channelTitle}</p>
            {date && (
              <p className="text-muted-foreground text-xs">{date}</p>
            )}
          </div>
        </div>

        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className={`${buttonVariants({ size: "sm" })} block w-full text-center`}
        >
          Abrir no YouTube
        </a>
      </div>
    </div>
  );
}

function UploadForm({
  slug,
  publish,
  onPublished,
  title,
  onTitleChange,
  privacyStatus,
  onPrivacyStatusChange,
}: {
  slug: string;
  publish: ReturnType<typeof useYoutube>["publish"];
  onPublished: () => void;
  title: string;
  onTitleChange: (v: string) => void;
  privacyStatus: string;
  onPrivacyStatusChange: (v: string) => void;
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
      onTitleChange("");
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
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
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
            <Select
              name="privacyStatus"
              value={privacyStatus}
              onValueChange={(v) => v && onPrivacyStatusChange(v)}
            >
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
  );
}

export function YoutubeStudio({ slug }: { slug: string }) {
  const {
    overview,
    videos,
    insights,
    range,
    setRange,
    isLoading,
    error,
    refetch,
    publish,
  } = useYoutube(slug);

  const [title, setTitle] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("private");
  const [selectedVideo, setSelectedVideo] = useState<YoutubeVideo | null>(null);

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
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-4">
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

      <Tabs defaultValue="overview">
        <div className="mb-6 border-b border-border/60">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="post">Post</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
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

          {videos && videos.videos.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {videos.videos.map((video) => {
                const date = video.publishedAt
                  ? new Date(video.publishedAt).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : null;
                return (
                  <button
                    key={video.videoId}
                    type="button"
                    onClick={() => setSelectedVideo(video)}
                    className="block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Card className="group overflow-hidden p-0">
                      <div className="relative aspect-video w-full bg-muted">
                        {video.thumbnailUrl ? (
                          // biome-ignore lint/performance/noImgElement: thumbnail externa do YouTube
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="size-full object-cover transition-transform group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground/30">
                            <HugeiconsIcon icon={Video01Icon} className="size-10" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5 p-3">
                        <p className="line-clamp-2 font-medium text-sm leading-snug">
                          {video.title}
                        </p>
                        {date && (
                          <p className="text-muted-foreground text-xs">{date}</p>
                        )}
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          ) : videos && videos.videos.length === 0 ? (
            <Card className="px-4 py-10 text-center text-muted-foreground text-sm">
              <HugeiconsIcon
                icon={Video01Icon}
                className="mx-auto mb-2 size-6 opacity-60"
              />
              Nenhum vídeo recente.
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="post">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base tracking-tight">
                Publicar vídeo
              </h3>
              <UploadForm
                slug={slug}
                publish={publish}
                onPublished={refetch}
                title={title}
                onTitleChange={setTitle}
                privacyStatus={privacyStatus}
                onPrivacyStatusChange={setPrivacyStatus}
              />
            </div>
            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base tracking-tight text-muted-foreground">
                Pré-visualização
              </h3>
              <YoutubeVideoPreview
                channelTitle={overview.title}
                channelThumbnailUrl={overview.thumbnailUrl}
                title={title}
                privacyStatus={privacyStatus}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
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
        </TabsContent>
      </Tabs>

      <Dialog
        open={selectedVideo !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedVideo(null);
        }}
      >
        <DialogContent className="sm:max-w-xl gap-0 p-0 overflow-hidden">
          {selectedVideo && (
            <YoutubeVideoModal
              video={selectedVideo}
              channelTitle={overview.title}
              channelThumbnailUrl={overview.thumbnailUrl}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
