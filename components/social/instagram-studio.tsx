"use client";

import {
  Analytics01Icon,
  BookmarkIcon,
  Comment01Icon,
  EyeIcon,
  FavouriteIcon,
  InstagramIcon,
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
import { type InstagramError, useInstagram } from "@/src/hooks/use-instagram";
import type { InstagramInsightsRange } from "@/src/schemas/instagram.schema";

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
    <div className="mx-auto max-w-[340px] overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
          {avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: avatar externo do Instagram
            <img
              src={avatarUrl}
              alt={username}
              className="size-8 rounded-full border-2 border-background object-cover"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-background">
              <HugeiconsIcon
                icon={InstagramIcon}
                className="size-4 text-pink-500"
              />
            </div>
          )}
        </div>
        <span className="font-semibold text-sm">{username || "username"}</span>
        <span className="ml-auto select-none text-muted-foreground">···</span>
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
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground/30">
            <HugeiconsIcon icon={InstagramIcon} className="size-10" />
            <span className="text-xs">Selecione uma imagem</span>
          </div>
        )}
      </div>

      <div className="space-y-2 px-3 py-2.5">
        <div className="flex items-center gap-3.5">
          <HugeiconsIcon icon={FavouriteIcon} className="size-[22px]" />
          <HugeiconsIcon icon={Comment01Icon} className="size-[22px]" />
          <HugeiconsIcon icon={Share08Icon} className="size-[22px]" />
          <HugeiconsIcon icon={BookmarkIcon} className="ml-auto size-[22px]" />
        </div>
        {caption ? (
          <p className="text-sm leading-snug">
            <span className="font-semibold">{username}</span>{" "}
            <span className="line-clamp-3">{caption}</span>
          </p>
        ) : (
          <p className="text-muted-foreground/50 text-xs italic">
            A legenda aparecerá aqui…
          </p>
        )}
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
    insights,
    range,
    setRange,
    isLoading,
    error,
    refetch,
    publish,
  } = useInstagram(slug);

  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>();

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
                        id: "Alcance",
                        data: insights.series.map((p) => ({
                          x: p.date,
                          y: p.reach,
                        })),
                      },
                      {
                        id: "Visitas",
                        data: insights.series.map((p) => ({
                          x: p.date,
                          y: p.profileViews,
                        })),
                      },
                    ]}
                    margin={{ top: 16, right: 20, bottom: 64, left: 52 }}
                    colors={["#ec4899", "#a855f7", "#f59e0b"]}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
