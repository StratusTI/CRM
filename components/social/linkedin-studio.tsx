"use client";

import {
  Linkedin01Icon,
  Mail01Icon,
  Share01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { type LinkedInError, useLinkedIn } from "@/src/hooks/use-linkedin";

const RECONNECT_CODES = new Set([
  "SOCIAL_CONNECTION_NOT_FOUND",
  "SOCIAL_SCOPE_MISSING",
  "SOCIAL_TOKEN_EXPIRED",
]);

function ErrorState({
  error,
  slug,
}: {
  error: LinkedInError;
  slug: string;
}) {
  const needsReconnect = error.code && RECONNECT_CODES.has(error.code);
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <HugeiconsIcon
        icon={Linkedin01Icon}
        className="size-10 text-muted-foreground"
      />
      <p className="text-sm text-muted-foreground">{error.message}</p>
      {needsReconnect && (
        <Link
          href={`/settings?tab=social`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Reconectar LinkedIn
        </Link>
      )}
    </div>
  );
}

function ProfileCard({
  name,
  email,
  picture,
}: {
  name: string | null;
  email: string | null;
  picture: string | null;
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      {picture ? (
        <img
          src={picture}
          alt={name ?? "Perfil"}
          className="size-12 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-700/10">
          <HugeiconsIcon
            icon={UserCircleIcon}
            className="size-6 text-blue-700"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name ?? "—"}</p>
        {email && (
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            <HugeiconsIcon icon={Mail01Icon} className="size-3.5 shrink-0" />
            {email}
          </p>
        )}
      </div>
    </Card>
  );
}

function PublishForm({
  onPublish,
  isPublishing,
}: {
  onPublish: (text: string) => Promise<{ ok: boolean; error?: LinkedInError }>;
  isPublishing: boolean;
}) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const result = await onPublish(text);
    if (result.ok) {
      setText("");
      setFeedback({ type: "success", message: "Post publicado com sucesso!" });
    } else {
      setFeedback({
        type: "error",
        message: result.error?.message ?? "Erro ao publicar.",
      });
    }
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-medium">Novo post</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="O que você quer compartilhar?"
          rows={4}
          maxLength={3000}
          className="resize-none"
        />
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
  );
}

export function LinkedInStudio({ slug }: { slug: string }) {
  const { overview, isLoading, isPublishing, error, publish } =
    useLinkedIn(slug);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} slug={slug} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={Linkedin01Icon}
          className="size-5 text-blue-700"
        />
        <h2 className="text-lg font-semibold">LinkedIn</h2>
      </div>

      {overview && (
        <ProfileCard
          name={overview.name}
          email={overview.email}
          picture={overview.picture}
        />
      )}

      <PublishForm onPublish={publish} isPublishing={isPublishing} />

      <p className="text-xs text-muted-foreground">
        Métricas avançadas (impressões, engajamento) estão disponíveis apenas
        para contas com acesso ao{" "}
        <span className="font-medium">LinkedIn Marketing Partner Program</span>.
      </p>
    </div>
  );
}
