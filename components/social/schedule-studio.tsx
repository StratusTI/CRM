"use client";

import {
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Delete02Icon,
  ImageAdd02Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SOCIAL_PLATFORM_META } from "@/components/social-platforms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useScheduledPosts } from "@/src/hooks/use-scheduled-posts";
import { useSocialConnections } from "@/src/hooks/use-social-connections";
import {
  PLATFORM_MEDIA_REQUIREMENT,
  PLATFORM_TEXT_LIMIT,
  PUBLISHABLE_PLATFORMS,
  type PublishablePlatform,
  type ScheduledPostDTO,
  type ScheduledPostStatus,
  type ScheduledPostTargetStatus,
} from "@/src/schemas/scheduled-post.schema";
import { SOCIAL_PLATFORM_LABELS } from "@/src/schemas/social-connection.schema";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function metaFor(platform: PublishablePlatform) {
  return SOCIAL_PLATFORM_META.find((m) => m.platform === platform);
}

const STATUS_LABEL: Record<ScheduledPostStatus, string> = {
  SCHEDULED: "Agendado",
  PUBLISHING: "Publicando",
  PUBLISHED: "Publicado",
  PARTIALLY_FAILED: "Parcial",
  FAILED: "Falhou",
  CANCELED: "Cancelado",
};

const STATUS_COLOR: Record<ScheduledPostStatus, string> = {
  SCHEDULED: "bg-blue-500/10 text-blue-600",
  PUBLISHING: "bg-amber-500/10 text-amber-600",
  PUBLISHED: "bg-green-500/10 text-green-600",
  PARTIALLY_FAILED: "bg-orange-500/10 text-orange-600",
  FAILED: "bg-destructive/10 text-destructive",
  CANCELED: "bg-muted text-muted-foreground",
};

const TARGET_COLOR: Record<ScheduledPostTargetStatus, string> = {
  PENDING: "text-muted-foreground",
  PUBLISHING: "text-amber-600",
  PUBLISHED: "text-green-600",
  FAILED: "text-destructive",
  CANCELED: "text-muted-foreground line-through",
};

/* -------------------------------- Composer -------------------------------- */

function Composer({
  slug,
  connected,
  onCreated,
}: {
  slug: string;
  connected: Set<PublishablePlatform>;
  onCreated: () => void;
}) {
  const { create } = useScheduledPosts(slug);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<Set<PublishablePlatform>>(new Set());
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"now" | "schedule">("schedule");
  const [scheduledFor, setScheduledFor] = useState("");
  const [youtubePrivacy, setYoutubePrivacy] = useState("public");
  const [tiktokPrivacy, setTiktokPrivacy] = useState("SELF_ONLY");
  const [submitting, setSubmitting] = useState(false);

  const platforms = useMemo(() => [...selected], [selected]);
  const hasImage = files.some((f) => f.type.startsWith("image/"));
  const hasVideo = files.some((f) => f.type.startsWith("video/"));
  const needsYoutube = selected.has("YOUTUBE");
  const needsTiktok = selected.has("TIKTOK");

  // Limite de texto = o menor entre as plataformas selecionadas.
  const textLimit = platforms.length
    ? Math.min(...platforms.map((p) => PLATFORM_TEXT_LIMIT[p]))
    : 5000;

  function toggle(platform: PublishablePlatform) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  function validate(): string | null {
    if (platforms.length === 0) return "Selecione ao menos uma plataforma.";
    if (content.length > textLimit)
      return `O texto excede o limite de ${textLimit} caracteres.`;
    for (const p of platforms) {
      const req = PLATFORM_MEDIA_REQUIREMENT[p];
      if (req === "image" && !hasImage)
        return `${SOCIAL_PLATFORM_LABELS[p]} exige uma imagem.`;
      if (req === "video" && !hasVideo)
        return `${SOCIAL_PLATFORM_LABELS[p]} exige um vídeo.`;
    }
    if (
      (selected.has("TWITTER") || selected.has("LINKEDIN")) &&
      !content.trim()
    )
      return "X e LinkedIn exigem um texto.";
    if (mode === "schedule") {
      if (!scheduledFor) return "Informe a data e hora do agendamento.";
      if (new Date(scheduledFor).getTime() <= Date.now())
        return "A data do agendamento deve estar no futuro.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    setSubmitting(true);
    const result = await create({
      platforms,
      content,
      title: title.trim() || undefined,
      mode,
      scheduledFor:
        mode === "schedule" ? new Date(scheduledFor).toISOString() : undefined,
      options: {
        youtube: needsYoutube
          ? {
              privacy: youtubePrivacy as "private" | "unlisted" | "public",
              tags: [],
            }
          : undefined,
        tiktok: needsTiktok
          ? {
              privacy: tiktokPrivacy as
                | "SELF_ONLY"
                | "FOLLOWER_OF_CREATOR"
                | "MUTUAL_FOLLOW_FRIENDS"
                | "PUBLIC_TO_EVERYONE",
              disableComment: false,
              disableDuet: false,
              disableStitch: false,
            }
          : undefined,
      },
      files,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.message ?? "Falha ao salvar.");
      return;
    }
    toast.success(
      mode === "now" ? "Publicação enviada!" : "Post agendado com sucesso!",
    );
    setSelected(new Set());
    setContent("");
    setTitle("");
    setFiles([]);
    setScheduledFor("");
    if (fileRef.current) fileRef.current.value = "";
    onCreated();
  }

  return (
    <Card className="p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Plataformas */}
        <div className="space-y-2">
          <Label>Plataformas</Label>
          <div className="flex flex-wrap gap-2">
            {PUBLISHABLE_PLATFORMS.map((platform) => {
              const meta = metaFor(platform);
              const isConnected = connected.has(platform);
              const isOn = selected.has(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  disabled={!isConnected}
                  onClick={() => toggle(platform)}
                  title={
                    isConnected
                      ? undefined
                      : "Conecte esta conta em Configurações"
                  }
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    isOn
                      ? "border-primary bg-primary/5"
                      : "border-border/70 hover:bg-muted/50"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {meta && (
                    <span
                      className={`flex size-5 items-center justify-center rounded ${meta.color}`}
                    >
                      <HugeiconsIcon
                        icon={meta.icon}
                        className="size-3 text-white"
                      />
                    </span>
                  )}
                  {SOCIAL_PLATFORM_LABELS[platform]}
                  {isOn && (
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      className="size-3.5 text-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {platforms.some((p) => PLATFORM_MEDIA_REQUIREMENT[p] === "video") && (
            <p className="text-muted-foreground text-xs">
              YouTube e TikTok exigem um arquivo de vídeo.
            </p>
          )}
        </div>

        {/* Título (YouTube) */}
        {needsYoutube && (
          <div className="space-y-2">
            <Label htmlFor="post-title">Título (YouTube)</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do vídeo"
              maxLength={100}
            />
          </div>
        )}

        {/* Conteúdo */}
        <div className="space-y-2">
          <Label htmlFor="post-content">Conteúdo</Label>
          <Textarea
            id="post-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva o texto do post…"
            rows={5}
            maxLength={textLimit}
            className="resize-none"
          />
          <span className="text-muted-foreground text-xs">
            {content.length}/{textLimit}
          </span>
        </div>

        {/* Mídia */}
        <div className="space-y-2">
          <Label htmlFor="post-media">Mídia</Label>
          <Input
            id="post-media"
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <ul className="space-y-1 text-muted-foreground text-xs">
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={ImageAdd02Icon} className="size-3.5" />
                  {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Opções avançadas por plataforma */}
        {(needsYoutube || needsTiktok) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {needsYoutube && (
              <div className="space-y-2">
                <Label>Privacidade (YouTube)</Label>
                <Select
                  value={youtubePrivacy}
                  onValueChange={(v) => v && setYoutubePrivacy(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Público</SelectItem>
                    <SelectItem value="unlisted">Não listado</SelectItem>
                    <SelectItem value="private">Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {needsTiktok && (
              <div className="space-y-2">
                <Label>Privacidade (TikTok)</Label>
                <Select
                  value={tiktokPrivacy}
                  onValueChange={(v) => v && setTiktokPrivacy(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC_TO_EVERYONE">Público</SelectItem>
                    <SelectItem value="MUTUAL_FOLLOW_FRIENDS">
                      Amigos
                    </SelectItem>
                    <SelectItem value="FOLLOWER_OF_CREATOR">
                      Seguidores
                    </SelectItem>
                    <SelectItem value="SELF_ONLY">Somente eu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Quando publicar */}
        <div className="space-y-2">
          <Label>Quando publicar</Label>
          <div className="flex flex-wrap items-center gap-4">
            <Label
              htmlFor="mode-now"
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                id="mode-now"
                checked={mode === "now"}
                onCheckedChange={() => setMode("now")}
              />
              Agora
            </Label>
            <Label
              htmlFor="mode-schedule"
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                id="mode-schedule"
                checked={mode === "schedule"}
                onCheckedChange={() => setMode("schedule")}
              />
              Agendar
            </Label>
            {mode === "schedule" && (
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-auto"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            <HugeiconsIcon
              icon={mode === "now" ? SentIcon : Calendar01Icon}
              className="mr-1.5 size-4"
            />
            {submitting
              ? "Enviando…"
              : mode === "now"
                ? "Publicar agora"
                : "Agendar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ---------------------------------- List ---------------------------------- */

function PostRow({
  post,
  onCancel,
}: {
  post: ScheduledPostDTO;
  onCancel: (id: string) => void;
}) {
  const canCancel = post.status === "SCHEDULED" || post.status === "FAILED";
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLOR[post.status]}`}
          >
            {STATUS_LABEL[post.status]}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
            {dateFmt.format(new Date(post.scheduledFor))}
          </span>
        </div>
        {canCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancel(post.id)}
            className="text-destructive hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          </Button>
        )}
      </div>

      {post.content && (
        <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">
          {post.content}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {post.targets.map((t) => {
          const meta = SOCIAL_PLATFORM_META.find(
            (m) => m.platform === t.platform,
          );
          return (
            <span
              key={t.id}
              className={`flex items-center gap-1.5 text-xs ${TARGET_COLOR[t.status]}`}
              title={t.error ?? undefined}
            >
              {meta && (
                <span
                  className={`flex size-4 items-center justify-center rounded ${meta.color}`}
                >
                  <HugeiconsIcon
                    icon={meta.icon}
                    className="size-2.5 text-white"
                  />
                </span>
              )}
              {SOCIAL_PLATFORM_LABELS[t.platform]}
            </span>
          );
        })}
        {post.media.length > 0 && (
          <span className="text-muted-foreground text-xs">
            {post.media.length} mídia(s)
          </span>
        )}
      </div>

      {post.lastError && (
        <p className="text-destructive text-xs">{post.lastError}</p>
      )}
    </Card>
  );
}

/* --------------------------------- Studio --------------------------------- */

export function ScheduleStudio({ slug }: { slug: string }) {
  const { posts, isLoading, refetch, cancel } = useScheduledPosts(slug);
  const { connections } = useSocialConnections(slug);

  const connected = useMemo(() => {
    const set = new Set<PublishablePlatform>();
    for (const c of connections) {
      if (
        c.status === "CONNECTED" &&
        (PUBLISHABLE_PLATFORMS as readonly string[]).includes(c.platform)
      ) {
        set.add(c.platform as PublishablePlatform);
      }
    }
    return set;
  }, [connections]);

  async function handleCancel(id: string) {
    const result = await cancel(id);
    if (result.ok) toast.success("Post cancelado.");
    else toast.error(result.message ?? "Falha ao cancelar.");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Agendar posts
        </h2>
        <p className="text-muted-foreground text-sm">
          Componha uma vez e publique em várias redes — agora ou na data
          marcada.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <Composer slug={slug} connected={connected} onCreated={refetch} />

        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-base tracking-tight text-muted-foreground">
            Agendamentos
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : posts.length === 0 ? (
            <p className="rounded-lg border border-border/60 border-dashed p-6 text-center text-muted-foreground text-sm">
              Nenhum post agendado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostRow key={post.id} post={post} onCancel={handleCancel} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
