"use client";

import {
  Analytics01Icon,
  Comment01Icon,
  FavouriteIcon,
  NewTwitterIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { type TwitterError, useTwitter } from "@/src/hooks/use-twitter";
import type { TwitterTweet } from "@/src/schemas/twitter.schema";

const TWEET_MAX = 280;

const RECONNECT_CODES = new Set([
  "SOCIAL_CONNECTION_NOT_FOUND",
  "SOCIAL_SCOPE_MISSING",
  "SOCIAL_TOKEN_EXPIRED",
  "SOCIAL_PROVIDER_NOT_CONFIGURED",
]);

function ReconnectNotice({
  slug,
  error,
}: {
  slug: string;
  error: TwitterError;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-muted-foreground">
        <HugeiconsIcon icon={NewTwitterIcon} className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Conecte o X (Twitter)
        </h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Link href={`/${slug}/settings`} className={buttonVariants()}>
        Ir para configurações
      </Link>
    </div>
  );
}

function TweetPreview({
  name,
  username,
  avatarUrl,
  text,
  imageFile,
}: {
  name?: string | null;
  username: string;
  avatarUrl?: string | null;
  text: string;
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
      <div className="flex gap-3 p-3 pb-2">
        {avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do X
          <img
            src={avatarUrl}
            alt={username}
            className="size-10 shrink-0 rounded-full border border-border/50 object-cover"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900/10 text-neutral-900 dark:bg-white/10 dark:text-white">
            <HugeiconsIcon icon={NewTwitterIcon} className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-semibold text-sm">
              {name ?? username}
            </span>
            <span className="shrink-0 text-muted-foreground text-sm">
              @{username}
            </span>
          </div>

          {text ? (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {text}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground/50 text-sm italic">
              O tweet aparecerá aqui…
            </p>
          )}

          {previewUrl && (
            <div className="mt-2 overflow-hidden rounded-xl border border-border/50">
              <div className="aspect-video w-full bg-muted">
                {/* biome-ignore lint/performance/noImgElement: preview local via object URL */}
                <img
                  src={previewUrl}
                  alt="preview"
                  className="size-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-5 text-muted-foreground">
            <span className="flex items-center gap-1.5 text-xs">
              <HugeiconsIcon icon={Comment01Icon} className="size-4" />0
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <HugeiconsIcon icon={Share08Icon} className="size-4" />0
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <HugeiconsIcon icon={FavouriteIcon} className="size-4" />0
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <HugeiconsIcon icon={Analytics01Icon} className="size-4" />0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TwitterTweetModal({
  tweet,
  name,
  username,
  avatarUrl,
}: {
  tweet: TwitterTweet;
  name?: string | null;
  username: string;
  avatarUrl?: string | null;
}) {
  const date = tweet.createdAt
    ? new Date(tweet.createdAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        {avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do X
          <img
            src={avatarUrl}
            alt={username}
            className="size-11 shrink-0 rounded-full border border-border/50 object-cover"
          />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-900/10 text-neutral-900 dark:bg-white/10 dark:text-white">
            <HugeiconsIcon icon={NewTwitterIcon} className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="font-semibold text-sm">{name ?? username}</span>
            <span className="text-muted-foreground text-sm">@{username}</span>
          </div>
          {date && (
            <p className="text-muted-foreground text-xs">{date}</p>
          )}
        </div>
        <HugeiconsIcon
          icon={NewTwitterIcon}
          className="ml-auto size-5 shrink-0 text-muted-foreground/60"
        />
      </div>

      <p className="whitespace-pre-wrap text-base leading-relaxed">{tweet.text}</p>

      {tweet.metrics && (
        <>
          <div className="border-t border-border/60 pt-3">
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <span>
                <span className="font-semibold">{nf.format(tweet.metrics.retweetCount)}</span>{" "}
                <span className="text-muted-foreground">Retweets</span>
              </span>
              <span>
                <span className="font-semibold">{nf.format(tweet.metrics.likeCount)}</span>{" "}
                <span className="text-muted-foreground">Curtidas</span>
              </span>
              {tweet.metrics.impressionCount > 0 && (
                <span>
                  <span className="font-semibold">{nf.format(tweet.metrics.impressionCount)}</span>{" "}
                  <span className="text-muted-foreground">Impressões</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5 border-t border-border/60 pt-2 text-muted-foreground">
            <button type="button" className="flex items-center gap-2 py-1 hover:text-blue-500 transition-colors">
              <HugeiconsIcon icon={Comment01Icon} className="size-5" />
              <span className="text-sm">{nf.format(tweet.metrics.replyCount)}</span>
            </button>
            <button type="button" className="flex items-center gap-2 py-1 hover:text-green-500 transition-colors">
              <HugeiconsIcon icon={Share08Icon} className="size-5" />
              <span className="text-sm">{nf.format(tweet.metrics.retweetCount)}</span>
            </button>
            <button type="button" className="flex items-center gap-2 py-1 hover:text-pink-500 transition-colors">
              <HugeiconsIcon icon={FavouriteIcon} className="size-5" />
              <span className="text-sm">{nf.format(tweet.metrics.likeCount)}</span>
            </button>
            <button type="button" className="flex items-center gap-2 py-1 hover:text-foreground transition-colors">
              <HugeiconsIcon icon={Analytics01Icon} className="size-5" />
              <span className="text-sm">{nf.format(tweet.metrics.impressionCount)}</span>
            </button>
          </div>
        </>
      )}

      <a
        href={tweet.url}
        target="_blank"
        rel="noreferrer"
        className={`${buttonVariants({ variant: "outline", size: "sm" })} block w-full text-center`}
      >
        Abrir no X
      </a>
    </div>
  );
}

const nf = new Intl.NumberFormat("pt-BR");

function TweetComposer({
  slug,
  publish,
  text,
  onTextChange,
  onImageChange,
}: {
  slug: string;
  publish: ReturnType<typeof useTwitter>["publish"];
  text: string;
  onTextChange: (v: string) => void;
  onImageChange: (f: File | undefined) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const remaining = TWEET_MAX - text.length;
  const canSubmit = text.trim().length > 0 && remaining >= 0 && !submitting;

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    setSubmitting(true);
    const result = await publish(form);
    setSubmitting(false);

    if (result.ok) {
      toast.success("Tweet publicado.", {
        action: result.tweet.permalink
          ? {
              label: "Abrir",
              onClick: () => window.open(result.tweet.permalink ?? "", "_blank"),
            }
          : undefined,
      });
      formEl.reset();
      onTextChange("");
      onImageChange(undefined);
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
          <div className="flex items-center justify-between">
            <Label htmlFor="tw-text">Tweet</Label>
            <span
              className={`text-xs tabular-nums ${
                remaining < 0 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {remaining}
            </span>
          </div>
          <Textarea
            id="tw-text"
            name="text"
            rows={5}
            maxLength={TWEET_MAX}
            placeholder="O que está acontecendo?"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tw-image">Imagem (opcional)</Label>
          <Input
            id="tw-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => onImageChange(e.target.files?.[0])}
          />
          <p className="text-muted-foreground text-xs">
            JPEG, PNG, WebP ou GIF, até 10 MB. O upload de mídia depende do
            nível de acesso do app no X.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? "Publicando…" : "Publicar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function TwitterStudio({ slug }: { slug: string }) {
  const { overview, tweets, isLoading, error, refetch, publish } = useTwitter(slug);

  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [selectedTweet, setSelectedTweet] = useState<TwitterTweet | null>(null);

  if (isLoading && !overview) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-56 w-full" />
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-4">
        {overview.profileImageUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do X, sem host configurado em next/image
          <img
            src={overview.profileImageUrl}
            alt={overview.username}
            className="size-16 rounded-full border border-border/70"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-neutral-900/10 text-neutral-900 dark:bg-white/10 dark:text-white">
            <HugeiconsIcon icon={NewTwitterIcon} className="size-7" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-heading font-semibold text-xl tracking-tight">
            {overview.name ?? `@${overview.username}`}
          </h2>
          {overview.username ? (
            <p className="truncate text-muted-foreground text-sm">
              @{overview.username}
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

        <TabsContent value="overview" className="space-y-3">
          {tweets && tweets.tweets.length > 0 ? (
            tweets.tweets.map((tweet) => {
              const date = tweet.createdAt
                ? new Date(tweet.createdAt).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null;
              return (
                <button
                  key={tweet.id}
                  type="button"
                  onClick={() => setSelectedTweet(tweet)}
                  className="block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="space-y-2 p-3 transition-colors hover:bg-muted/40">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {tweet.text}
                    </p>
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                      {tweet.metrics && (
                        <>
                          <span className="flex items-center gap-1">
                            <HugeiconsIcon icon={FavouriteIcon} className="size-3.5" />
                            {tweet.metrics.likeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <HugeiconsIcon icon={Share08Icon} className="size-3.5" />
                            {tweet.metrics.retweetCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <HugeiconsIcon icon={Comment01Icon} className="size-3.5" />
                            {tweet.metrics.replyCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <HugeiconsIcon icon={Analytics01Icon} className="size-3.5" />
                            {tweet.metrics.impressionCount}
                          </span>
                        </>
                      )}
                      {date && <span className="ml-auto">{date}</span>}
                    </div>
                  </Card>
                </button>
              );
            })
          ) : (
            <Card className="px-4 py-6 text-center text-muted-foreground text-sm">
              <HugeiconsIcon
                icon={NewTwitterIcon}
                className="mx-auto mb-3 size-8 opacity-40"
              />
              <p>
                Nenhum tweet recente encontrado ou acesso à timeline não
                disponível no plano atual da API do X.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="post">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base tracking-tight">
                Publicar
              </h3>
              <TweetComposer
                slug={slug}
                publish={publish}
                text={text}
                onTextChange={setText}
                onImageChange={setImageFile}
              />
            </div>
            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base tracking-tight text-muted-foreground">
                Pré-visualização
              </h3>
              <TweetPreview
                name={overview.name}
                username={overview.username}
                avatarUrl={overview.profileImageUrl}
                text={text}
                imageFile={imageFile}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="px-4 py-6 text-center text-muted-foreground text-sm">
            <HugeiconsIcon
              icon={Analytics01Icon}
              className="mx-auto mb-3 size-8 opacity-40"
            />
            <p>
              Analytics não estão disponíveis no plano gratuito da API do X
              (Twitter).
            </p>
            <p className="mt-1 text-xs">
              Um plano Basic ou superior é necessário para acessar métricas de
              tweets.
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={selectedTweet !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTweet(null);
        }}
      >
        <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
          {selectedTweet && (
            <TwitterTweetModal
              tweet={selectedTweet}
              name={overview.name}
              username={overview.username}
              avatarUrl={overview.profileImageUrl}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
