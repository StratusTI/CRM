"use client";

import {
  Analytics01Icon,
  Comment01Icon,
  FavouriteIcon,
  Linkedin01Icon,
  Mail01Icon,
  Share01Icon,
  UserCircleIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type LinkedInError, useLinkedIn } from "@/src/hooks/use-linkedin";
import type { LinkedInOverview } from "@/src/schemas/linkedin.schema";

const RECONNECT_CODES = new Set([
  "SOCIAL_CONNECTION_NOT_FOUND",
  "SOCIAL_SCOPE_MISSING",
  "SOCIAL_TOKEN_EXPIRED",
]);

function ReconnectNotice({
  slug,
  error,
}: {
  slug: string;
  error: LinkedInError;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-muted-foreground">
        <HugeiconsIcon icon={Linkedin01Icon} className="size-6 text-blue-700" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Conecte o LinkedIn
        </h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Link href={`/${slug}/settings`} className={buttonVariants()}>
        Ir para configurações
      </Link>
    </div>
  );
}

function LinkedInPostPreview({
  name,
  headline,
  picture,
  text,
  imageFile,
}: {
  name: string | null;
  headline: string | null;
  picture: string | null;
  text: string;
  imageFile?: File | null;
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
      <div className="flex items-start gap-3 p-4 pb-3">
        {picture ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do LinkedIn
          <img
            src={picture}
            alt={name ?? "Perfil"}
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-700/10">
            <HugeiconsIcon
              icon={UserCircleIcon}
              className="size-7 text-blue-700"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-snug">
            {name ?? "Seu nome"}
          </p>
          {headline && (
            <p className="line-clamp-2 text-muted-foreground text-xs">
              {headline}
            </p>
          )}
          <p className="mt-0.5 text-muted-foreground/60 text-xs">Agora · 🌐</p>
        </div>
      </div>
      <div className="px-4 pb-4">
        {text ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {text}
          </p>
        ) : (
          <p className="text-muted-foreground/40 text-sm italic">
            O conteúdo do post aparecerá aqui…
          </p>
        )}
      </div>
      {previewUrl && (
        <div className="aspect-video w-full border-t border-border/60 bg-muted">
          {/* biome-ignore lint/performance/noImgElement: preview local via object URL */}
          <img
            src={previewUrl}
            alt="preview"
            className="size-full object-cover"
          />
        </div>
      )}
      <div className="border-t border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-5 text-muted-foreground text-xs">
          <button
            type="button"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <HugeiconsIcon icon={FavouriteIcon} className="size-4" />
            Curtir
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <HugeiconsIcon icon={Comment01Icon} className="size-4" />
            Comentar
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <HugeiconsIcon icon={Share01Icon} className="size-4" />
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}

function PostComposer({
  overview,
  onPublish,
  isPublishing,
}: {
  overview: LinkedInOverview;
  onPublish: (
    text: string,
    image?: File | null,
  ) => Promise<{ ok: boolean; error?: LinkedInError }>;
  isPublishing: boolean;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const result = await onPublish(text, image);
    if (result.ok) {
      setText("");
      setImage(null);
      setFeedback({ type: "success", message: "Post publicado com sucesso!" });
    } else {
      setFeedback({
        type: "error",
        message: result.error?.message ?? "Erro ao publicar.",
      });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-base tracking-tight">
          Publicar no LinkedIn
        </h3>
        <Card className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="O que você quer compartilhar?"
              rows={6}
              maxLength={3000}
              className="resize-none"
            />
            <div className="space-y-1.5">
              <Label htmlFor="li-image">Imagem (opcional)</Label>
              <Input
                id="li-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
              <p className="text-muted-foreground text-xs">
                JPEG, PNG, WebP ou GIF, até 10 MB.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {text.length}/3000
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={!text.trim() || isPublishing}
              >
                <HugeiconsIcon icon={Share01Icon} className="mr-1.5 size-3.5" />
                {isPublishing ? "Publicando…" : "Publicar"}
              </Button>
            </div>
            {feedback && (
              <p
                className={`text-sm ${feedback.type === "success" ? "text-green-600" : "text-destructive"}`}
              >
                {feedback.message}
              </p>
            )}
          </form>
        </Card>
      </div>
      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-base tracking-tight text-muted-foreground">
          Pré-visualização
        </h3>
        <LinkedInPostPreview
          name={overview.name}
          headline={overview.headline}
          picture={overview.picture}
          text={text}
          imageFile={image}
        />
      </div>
    </div>
  );
}

export function LinkedInStudio({ slug }: { slug: string }) {
  const { overview, isLoading, isPublishing, error, publish, refetch } =
    useLinkedIn(slug);

  if (isLoading && !overview) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!overview && error) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <ReconnectNotice slug={slug} error={error} />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="px-4 py-6 text-center text-muted-foreground text-sm sm:px-6">
        Não foi possível carregar o perfil.
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
        {overview.picture ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do LinkedIn
          <img
            src={overview.picture}
            alt={overview.name ?? "LinkedIn"}
            className="size-16 rounded-full border border-border/70 object-cover"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-blue-700/10 text-blue-700">
            <HugeiconsIcon icon={Linkedin01Icon} className="size-7" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-heading font-semibold text-xl tracking-tight">
            {overview.name ?? "LinkedIn"}
          </h2>
          {overview.headline && (
            <p className="truncate text-muted-foreground text-sm">
              {overview.headline}
            </p>
          )}
          {overview.email && (
            <p className="flex items-center gap-1 truncate text-muted-foreground text-xs">
              <HugeiconsIcon icon={Mail01Icon} className="size-3.5 shrink-0" />
              {overview.email}
            </p>
          )}
        </div>
      </header>

      <Tabs defaultValue="overview">
        <div className="mb-6 border-b border-border/60">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="post">Post</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <Card className="divide-y divide-border/60">
            <div className="flex items-center gap-3 p-4">
              <HugeiconsIcon
                icon={UserCircleIcon}
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="w-24 shrink-0 text-muted-foreground text-sm">
                Nome
              </span>
              <span className="text-sm font-medium">
                {overview.name ?? "—"}
              </span>
            </div>
            {overview.headline && (
              <div className="flex items-start gap-3 p-4">
                <HugeiconsIcon
                  icon={UserMultipleIcon}
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <span className="w-24 shrink-0 text-muted-foreground text-sm">
                  Cargo
                </span>
                <span className="text-sm">{overview.headline}</span>
              </div>
            )}
            {overview.email && (
              <div className="flex items-center gap-3 p-4">
                <HugeiconsIcon
                  icon={Mail01Icon}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="w-24 shrink-0 text-muted-foreground text-sm">
                  Email
                </span>
                <span className="text-sm">{overview.email}</span>
              </div>
            )}
          </Card>
          <Card className="flex items-start gap-3 p-4">
            <HugeiconsIcon
              icon={Analytics01Icon}
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <p className="text-muted-foreground text-sm">
              Métricas avançadas (impressões, engajamento) estão disponíveis
              apenas para contas com acesso ao{" "}
              <span className="font-medium text-foreground">
                LinkedIn Marketing Partner Program
              </span>
              .
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="post">
          <PostComposer
            overview={overview}
            onPublish={publish}
            isPublishing={isPublishing}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
