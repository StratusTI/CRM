"use client";

import { NewTwitterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { type TwitterError, useTwitter } from "@/src/hooks/use-twitter";

const TWEET_MAX = 280;

const RECONNECT_CODES = new Set([
  "SOCIAL_CONNECTION_NOT_FOUND",
  "SOCIAL_SCOPE_MISSING",
  "SOCIAL_TOKEN_EXPIRED",
  "SOCIAL_PROVIDER_NOT_CONFIGURED",
]);

function ReconnectNotice({ slug, error }: { slug: string; error: TwitterError }) {
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

export function TwitterStudio({ slug }: { slug: string }) {
  const { overview, isLoading, error, refetch, publish } = useTwitter(slug);

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
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 sm:px-6">
      {/* Cabeçalho do perfil */}
      <header className="flex items-center gap-4">
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

      {/* Publicar */}
      <TweetComposer slug={slug} publish={publish} />
    </div>
  );
}

function TweetComposer({
  slug,
  publish,
}: {
  slug: string;
  publish: ReturnType<typeof useTwitter>["publish"];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");

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
      setText("");
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
        Publicar
      </h3>
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
              rows={4}
              maxLength={TWEET_MAX}
              placeholder="O que está acontecendo?"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tw-image">Imagem (opcional)</Label>
            <Input
              id="tw-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
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
    </section>
  );
}
