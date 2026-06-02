"use client";

import {
  Analytics01Icon,
  Comment01Icon,
  Facebook01Icon,
  FavouriteIcon,
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
import { type FacebookError, useFacebook } from "@/src/hooks/use-facebook";
import type { FacebookInsightsRange } from "@/src/schemas/facebook.schema";
import type { FacebookPost } from "@/src/schemas/facebook.schema";

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

function FacebookPostPreview({
  pageName,
  avatarUrl,
  message,
  imageFile,
}: {
  pageName: string;
  avatarUrl?: string | null;
  message: string;
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
    <div className="mx-auto max-w-[380px] overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="flex items-start gap-2.5 px-3 py-3">
        {avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do Facebook
          <img
            src={avatarUrl}
            alt={pageName}
            className="size-10 rounded-full border border-border/50 object-cover"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
            <HugeiconsIcon icon={Facebook01Icon} className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight">
            {pageName || "Página"}
          </p>
          <p className="text-muted-foreground text-xs">
            Agora · <span className="font-medium">🌐</span>
          </p>
        </div>
      </div>

      {message ? (
        <p className="line-clamp-5 px-3 pb-3 text-sm leading-relaxed">
          {message}
        </p>
      ) : (
        <p className="px-3 pb-3 text-muted-foreground/50 text-xs italic">
          A mensagem aparecerá aqui…
        </p>
      )}

      {previewUrl && (
        <div className="aspect-[4/3] w-full bg-muted">
          {/* biome-ignore lint/performance/noImgElement: preview local via object URL */}
          <img
            src={previewUrl}
            alt="preview"
            className="size-full object-cover"
          />
        </div>
      )}

      <div className="border-t border-border/60 px-3 py-1.5">
        <div className="flex items-center divide-x divide-border/60">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={FavouriteIcon} className="size-4" />
            Curtir
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={Comment01Icon} className="size-4" />
            Comentar
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={Share08Icon} className="size-4" />
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}

function FacebookPostModal({
  post,
  pageName,
  avatarUrl,
}: {
  post: FacebookPost;
  pageName: string;
  avatarUrl?: string | null;
}) {
  const date = post.createdTime
    ? new Date(post.createdTime).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const text = post.message ?? post.story;

  return (
    <div className="overflow-hidden rounded-xl">
      {post.fullPicture && (
        <div className="max-h-[55vh] overflow-hidden bg-black">
          {/* biome-ignore lint/performance/noImgElement: imagem externa do Facebook */}
          <img
            src={post.fullPicture}
            alt=""
            className="max-h-[55vh] w-full object-contain"
          />
        </div>
      )}

      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: avatar externo do Facebook
            <img
              src={avatarUrl}
              alt={pageName}
              className="size-10 rounded-full border border-border/50 object-cover"
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
              <HugeiconsIcon icon={Facebook01Icon} className="size-5" />
            </div>
          )}
          <div>
            <p className="font-semibold text-sm leading-tight">{pageName}</p>
            {date && (
              <p className="text-muted-foreground text-xs">{date}</p>
            )}
          </div>
        </div>

        {text && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        )}

        <div className="flex items-center gap-1 border-t border-border/60 pt-3">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={FavouriteIcon} className="size-4" />
            Curtir
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Comment01Icon} className="size-4" />
            Comentar
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Share08Icon} className="size-4" />
            Compartilhar
          </button>
        </div>

        {post.permalinkUrl && (
          <a
            href={post.permalinkUrl}
            target="_blank"
            rel="noreferrer"
            className={`${buttonVariants({ variant: "outline", size: "sm" })} block w-full text-center`}
          >
            Abrir no Facebook
          </a>
        )}
      </div>
    </div>
  );
}

function PostComposer({
  slug,
  publish,
  onPublished,
  message,
  onMessageChange,
  onImageChange,
}: {
  slug: string;
  publish: ReturnType<typeof useFacebook>["publish"];
  onPublished: () => void;
  message: string;
  onMessageChange: (v: string) => void;
  onImageChange: (f: File | undefined) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    const msg = (form.get("message") as string | null)?.trim() ?? "";
    const link = (form.get("link") as string | null)?.trim() ?? "";
    const image = form.get("image");
    const hasImage = image instanceof File && image.size > 0;
    if (!msg && !link && !hasImage) {
      toast.error("Escreva uma mensagem, um link ou anexe uma imagem.");
      return;
    }
    if (!link) form.delete("link");
    if (!hasImage) form.delete("image");

    setSubmitting(true);
    const result = await publish(form);
    setSubmitting(false);

    if (result.ok) {
      toast.success("Publicado no Facebook.");
      formEl.reset();
      onMessageChange("");
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
          <Label htmlFor="fb-message">Mensagem</Label>
          <Textarea
            id="fb-message"
            name="message"
            rows={5}
            maxLength={5000}
            placeholder="O que você quer publicar?"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
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
            <Input
              id="fb-image"
              name="image"
              type="file"
              accept="image/*"
              onChange={(e) => onImageChange(e.target.files?.[0])}
            />
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
  );
}

export function FacebookStudio({ slug }: { slug: string }) {
  const {
    overview,
    posts,
    insights,
    range,
    setRange,
    isLoading,
    error,
    refetch,
    publish,
  } = useFacebook(slug);

  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [selectedPost, setSelectedPost] = useState<FacebookPost | null>(null);

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
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-4">
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

      <Tabs defaultValue="overview">
        <div className="mb-6 border-b border-border/60">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="post">Post</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
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

          {posts && posts.posts.length > 0 ? (
            <div className="space-y-3">
              {posts.posts.map((post) => {
                const text = post.message ?? post.story;
                const date = post.createdTime
                  ? new Date(post.createdTime).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : null;
                const card = (
                  <Card key={post.id} className="overflow-hidden p-0">
                    {post.fullPicture && (
                      <div className="aspect-video w-full bg-muted">
                        {/* biome-ignore lint/performance/noImgElement: imagem externa do Facebook */}
                        <img
                          src={post.fullPicture}
                          alt=""
                          className="size-full object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-2 p-3">
                      {text && (
                        <p className="line-clamp-3 text-sm leading-relaxed">
                          {text}
                        </p>
                      )}
                      {date && (
                        <p className="text-muted-foreground text-xs">{date}</p>
                      )}
                    </div>
                  </Card>
                );
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {card}
                  </button>
                );
              })}
            </div>
          ) : posts && posts.posts.length === 0 ? (
            <Card className="px-4 py-10 text-center text-muted-foreground text-sm">
              <HugeiconsIcon
                icon={Facebook01Icon}
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
                Publicar na Página
              </h3>
              <PostComposer
                slug={slug}
                publish={publish}
                onPublished={refetch}
                message={message}
                onMessageChange={setMessage}
                onImageChange={setImageFile}
              />
            </div>
            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base tracking-tight text-muted-foreground">
                Pré-visualização
              </h3>
              <FacebookPostPreview
                pageName={overview.name}
                avatarUrl={overview.pictureUrl}
                message={message}
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
        </TabsContent>
      </Tabs>

      <Dialog
        open={selectedPost !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
      >
        <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
          {selectedPost && (
            <FacebookPostModal
              post={selectedPost}
              pageName={overview.name}
              avatarUrl={overview.pictureUrl}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
