"use client";

import {
  Analytics01Icon,
  BookmarkIcon,
  Comment01Icon,
  EyeIcon,
  FavouriteIcon,
  InstagramIcon,
  PlayIcon,
  Share08Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ResponsiveLine } from "@nivo/line";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { type InstagramError, useInstagram } from "@/src/hooks/use-instagram";
import type {
  InstagramInsightsRange,
  InstagramMedia,
  InstagramMediaEngagement,
} from "@/src/schemas/instagram.schema";

import {
  formatAxisLabel,
  getFortnightKey,
  toNivoSeries,
} from "./chart-utils";

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

const RANGES: { value: InstagramInsightsRange; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "28d", label: "28 dias" },
  { value: "90d", label: "90 dias" },
];

const RECONNECT_CODES = new Set([
  "SOCIAL_CONNECTION_NOT_FOUND",
  "SOCIAL_SCOPE_MISSING",
  "SOCIAL_TOKEN_EXPIRED",
  "SOCIAL_PROVIDER_NOT_CONFIGURED",
  "SOCIAL_IG_NOT_LINKED",
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

/** Card de um post do "Top 5 mais quentes (7d)" — capa + métricas somadas. */
function TopMediaCard({
  item,
  rank,
}: {
  item: InstagramMediaEngagement;
  rank: number;
}) {
  const imgSrc = item.mediaType === "VIDEO" ? item.thumbnailUrl : item.mediaUrl;
  const card = (
    <Card className="group relative overflow-hidden p-0">
      <span className="absolute top-2 left-2 z-10 flex size-5 items-center justify-center rounded-full bg-black/70 font-semibold text-[11px] text-white">
        {rank}
      </span>
      <div className="aspect-square w-full bg-muted">
        {imgSrc ? (
          // biome-ignore lint/performance/noImgElement: mídia externa do Instagram
          <img
            src={imgSrc}
            alt={item.caption ?? ""}
            className="size-full object-cover transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/30">
            <HugeiconsIcon icon={InstagramIcon} className="size-8" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5 text-white text-[11px]">
          <span className="flex items-center gap-1 tabular-nums">
            <HugeiconsIcon icon={FavouriteIcon} className="size-3" />
            {nf.format(item.likeCount)}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <HugeiconsIcon icon={Comment01Icon} className="size-3" />
            {nf.format(item.commentsCount)}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <HugeiconsIcon icon={BookmarkIcon} className="size-3" />
            {nf.format(item.saved)}
          </span>
        </div>
      </div>
    </Card>
  );

  if (!item.permalink) return card;
  return (
    <a
      href={item.permalink}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {card}
    </a>
  );
}

function ReconnectNotice({
  slug,
  error,
}: {
  slug: string;
  error: InstagramError;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-muted-foreground">
        <HugeiconsIcon icon={InstagramIcon} className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Conecte o Instagram
        </h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Link href={`/${slug}/settings`} className={buttonVariants()}>
        Ir para configurações
      </Link>
    </div>
  );
}

function InstagramPostPreview({
  username,
  avatarUrl,
  caption,
  imageFile,
}: {
  username: string;
  avatarUrl?: string | null;
  caption: string;
  imageFile?: File;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
          {avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: avatar externo do Instagram
            <img
              src={avatarUrl}
              alt={username}
              className="size-9 rounded-full border-2 border-background object-cover"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-background">
              <HugeiconsIcon
                icon={InstagramIcon}
                className="size-5 text-pink-500"
              />
            </div>
          )}
        </div>
        <span className="font-semibold text-sm">{username || "username"}</span>
        <span className="ml-auto select-none text-muted-foreground text-lg leading-none">
          ···
        </span>
      </div>

      <div className="aspect-square w-full bg-muted">
        {previewUrl ? (
          // biome-ignore lint/performance/noImgElement: preview local via object URL
          <img
            src={previewUrl}
            alt="preview"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 text-muted-foreground/30">
            <HugeiconsIcon icon={InstagramIcon} className="size-14" />
            <span className="text-sm">Selecione uma imagem</span>
          </div>
        )}
      </div>

      <div className="space-y-2.5 px-3 py-3">
        <div className="flex items-center gap-4">
          <HugeiconsIcon icon={FavouriteIcon} className="size-6" />
          <HugeiconsIcon icon={Comment01Icon} className="size-6" />
          <HugeiconsIcon icon={Share08Icon} className="size-6" />
          <HugeiconsIcon icon={BookmarkIcon} className="ml-auto size-6" />
        </div>
        {caption ? (
          <p className="break-words text-sm leading-snug">
            <span className="font-semibold">{username}</span>{" "}
            <span className="line-clamp-3">{caption}</span>
          </p>
        ) : (
          <p className="text-muted-foreground/40 text-sm italic">
            A legenda aparecerá aqui…
          </p>
        )}
      </div>
    </div>
  );
}

function InstagramMediaModal({
  item,
  username,
  avatarUrl,
}: {
  item: InstagramMedia;
  username: string;
  avatarUrl?: string | null;
}) {
  const imgSrc = item.mediaType === "VIDEO" ? item.thumbnailUrl : item.mediaUrl;
  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl md:flex-row">
      <div className="relative flex min-h-[260px] items-center justify-center bg-black md:min-h-0 md:w-[58%]">
        {imgSrc ? (
          // biome-ignore lint/performance/noImgElement: mídia externa do Instagram
          <img
            src={imgSrc}
            alt={item.caption ?? ""}
            className="max-h-[65vh] w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-white/20">
            <HugeiconsIcon icon={InstagramIcon} className="size-14" />
          </div>
        )}
        {item.mediaType === "VIDEO" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-black/50">
              <HugeiconsIcon icon={PlayIcon} className="size-7 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:w-[42%]">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
            {avatarUrl ? (
              // biome-ignore lint/performance/noImgElement: avatar externo do Instagram
              <img
                src={avatarUrl}
                alt={username}
                className="size-9 rounded-full border-2 border-background object-cover"
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-background">
                <HugeiconsIcon
                  icon={InstagramIcon}
                  className="size-4 text-pink-500"
                />
              </div>
            )}
          </div>
          <span className="font-semibold text-sm">{username}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {item.caption ? (
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">{username}</span> {item.caption}
            </p>
          ) : null}
          {date && (
            <p className="mt-3 text-muted-foreground text-xs uppercase tracking-wide">
              {date}
            </p>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border/60 px-4 py-3">
          <div className="flex items-center gap-4">
            <HugeiconsIcon icon={FavouriteIcon} className="size-6" />
            <HugeiconsIcon icon={Comment01Icon} className="size-6" />
            <HugeiconsIcon icon={Share08Icon} className="size-6" />
            <HugeiconsIcon icon={BookmarkIcon} className="ml-auto size-6" />
          </div>
          {item.permalink && (
            <a
              href={item.permalink}
              target="_blank"
              rel="noreferrer"
              className={`${buttonVariants({ variant: "outline", size: "sm" })} block w-full text-center`}
            >
              Abrir no Instagram
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PostComposer({
  slug,
  publish,
  onPublished,
  caption,
  onCaptionChange,
  onImageChange,
}: {
  slug: string;
  publish: ReturnType<typeof useInstagram>["publish"];
  onPublished: () => void;
  caption: string;
  onCaptionChange: (v: string) => void;
  onImageChange: (f: File | undefined) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    const image = form.get("image");
    const hasImage = image instanceof File && image.size > 0;
    if (!hasImage) {
      toast.error("Anexe uma imagem — o Instagram exige mídia para publicar.");
      return;
    }

    setSubmitting(true);
    const result = await publish(form);
    setSubmitting(false);

    if (result.ok) {
      toast.success("Publicado no Instagram.");
      formEl.reset();
      onCaptionChange("");
      onImageChange(undefined);
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
          <Label htmlFor="ig-caption">Legenda</Label>
          <Textarea
            id="ig-caption"
            name="caption"
            rows={5}
            maxLength={2200}
            placeholder="Escreva uma legenda (opcional)"
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ig-image">Imagem</Label>
          <Input
            id="ig-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png"
            required
            onChange={(e) => onImageChange(e.target.files?.[0])}
          />
          <p className="text-muted-foreground text-xs">
            JPEG ou PNG, até 10 MB. O Instagram não aceita vídeos, reels ou
            carrosséis nesta versão.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Publicando…" : "Publicar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function InstagramStudio({ slug }: { slug: string }) {
  const {
    overview,
    media,
    insights,
    engagement,
    range,
    setRange,
    isLoading,
    error,
    refetch,
    publish,
  } = useInstagram(slug);

  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [selectedMedia, setSelectedMedia] = useState<InstagramMedia | null>(null);

  if (isLoading && !overview) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-3 gap-3">
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
        {error?.message ?? "Não foi possível carregar o perfil."}
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
        {overview.profilePictureUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do Instagram, sem host configurado em next/image
          <img
            src={overview.profilePictureUrl}
            alt={overview.username}
            className="size-16 rounded-full border border-border/70"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
            <HugeiconsIcon icon={InstagramIcon} className="size-7" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-heading font-semibold text-xl tracking-tight">
            @{overview.username}
          </h2>
          {overview.name ? (
            <p className="truncate text-muted-foreground text-sm">
              {overview.name}
            </p>
          ) : null}
          {overview.biography ? (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
              {overview.biography}
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
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={UserMultipleIcon}
              label="Seguidores"
              value={overview.followersCount}
            />
            <StatCard
              icon={UserMultipleIcon}
              label="Seguindo"
              value={overview.followsCount}
            />
            <StatCard
              icon={Analytics01Icon}
              label="Publicações"
              value={overview.mediaCount}
            />
          </div>

          {media && media.media.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {media.media.map((item) => {
                const imgSrc =
                  item.mediaType === "VIDEO"
                    ? item.thumbnailUrl
                    : item.mediaUrl;
                const card = (
                  <Card
                    key={item.id}
                    className="group relative overflow-hidden p-0"
                  >
                    <div className="aspect-square w-full bg-muted">
                      {imgSrc ? (
                        // biome-ignore lint/performance/noImgElement: mídia externa do Instagram
                        <img
                          src={imgSrc}
                          alt={item.caption ?? ""}
                          className="size-full object-cover transition-transform group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground/30">
                          <HugeiconsIcon icon={InstagramIcon} className="size-8" />
                        </div>
                      )}
                      {item.mediaType === "VIDEO" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex size-8 items-center justify-center rounded-full bg-black/50 text-white">
                            <HugeiconsIcon icon={PlayIcon} className="size-4" />
                          </div>
                        </div>
                      )}
                      {item.mediaType === "CAROUSEL_ALBUM" && (
                        <div className="absolute top-2 right-2">
                          <div className="flex size-5 items-center justify-center rounded bg-black/50">
                            <HugeiconsIcon icon={Analytics01Icon} className="size-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMedia(item)}
                    className="block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {card}
                  </button>
                );
              })}
            </div>
          ) : media && media.media.length === 0 ? (
            <Card className="px-4 py-10 text-center text-muted-foreground text-sm">
              <HugeiconsIcon
                icon={InstagramIcon}
                className="mx-auto mb-2 size-6 opacity-60"
              />
              Nenhuma publicação recente.
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="post">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base tracking-tight">
                Publicar no feed
              </h3>
              <PostComposer
                slug={slug}
                publish={publish}
                onPublished={refetch}
                caption={caption}
                onCaptionChange={setCaption}
                onImageChange={setImageFile}
              />
            </div>
            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base tracking-tight text-muted-foreground">
                Pré-visualização
              </h3>
              <InstagramPostPreview
                username={overview.username}
                avatarUrl={overview.profilePictureUrl}
                caption={caption}
                imageFile={imageFile}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading font-semibold text-lg tracking-tight">
              Insights
            </h3>
            <Tabs
              value={range}
              onValueChange={(v) => setRange(v as InstagramInsightsRange)}
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
                  icon={EyeIcon}
                  label="Alcance"
                  value={insights.totals.reach}
                />
                <StatCard
                  icon={UserMultipleIcon}
                  label="Visitas ao perfil"
                  value={insights.totals.profileViews}
                />
              </div>
              <Card className="h-72 p-2 text-muted-foreground">
                {insights.series.length > 0 ? (
                  (() => {
                    const gk = range === "90d" ? getFortnightKey : null;
                    const s1 = toNivoSeries(insights.series, (p) => p.impressions, gk);
                    const s2 = toNivoSeries(insights.series, (p) => p.reach, gk);
                    const s3 = toNivoSeries(insights.series, (p) => p.profileViews, gk);
                    const ticks: string[] | number = gk
                      ? s1.map((d) => d.x)
                      : range === "7d" ? 7 : 7;
                    return (
                      <ResponsiveLine
                        data={[
                          { id: "Impressões", data: s1 },
                          { id: "Alcance", data: s2 },
                          { id: "Visitas", data: s3 },
                        ]}
                        margin={{ top: 36, right: 20, bottom: 64, left: 52 }}
                        colors={["#ec4899", "#a855f7", "#f59e0b"]}
                        curve="monotoneX"
                        pointSize={range === "7d" ? 5 : range === "28d" ? 3 : 0}
                        pointColor={{ from: "color" }}
                        useMesh
                        xScale={{ type: "point" }}
                        yScale={{ type: "linear", min: 0, max: "auto" }}
                        axisBottom={{
                          tickSize: 0,
                          tickPadding: 8,
                          tickRotation: -45,
                          tickValues: ticks,
                          format: formatAxisLabel,
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
                    );
                  })()
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

          <div className="space-y-3 border-t border-border/60 pt-4">
            <h3 className="font-heading font-semibold text-lg tracking-tight">
              Engajamento (7 dias)
            </h3>
            {engagement ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatCard
                    icon={EyeIcon}
                    label="Views"
                    value={engagement.views7d}
                  />
                  <StatCard
                    icon={BookmarkIcon}
                    label="Saves"
                    value={engagement.saves7d}
                  />
                  <StatCard
                    icon={UserMultipleIcon}
                    label="Visitar perfil"
                    value={engagement.profileViews7d}
                  />
                </div>
                {engagement.top5.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      Top 5 mais quentes
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {engagement.top5.map((item, i) => (
                        <TopMediaCard key={item.id} item={item} rank={i + 1} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <Card className="px-4 py-6 text-center text-muted-foreground text-sm">
                    Nenhuma publicação nos últimos 7 dias.
                  </Card>
                )}
              </>
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={selectedMedia !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMedia(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl gap-0 p-0 overflow-hidden">
          {selectedMedia && (
            <InstagramMediaModal
              item={selectedMedia}
              username={overview.username}
              avatarUrl={overview.profilePictureUrl}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
