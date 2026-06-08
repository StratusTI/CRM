"use client";

import {
  Album02Icon,
  Analytics01Icon,
  CheckmarkBadge01Icon,
  Comment01Icon,
  EyeIcon,
  FavouriteIcon,
  Share08Icon,
  TiktokIcon,
  UserGroupIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { type TiktokError, useTiktok } from "@/src/hooks/use-tiktok";
import type { TiktokPrivacy, TiktokVideo } from "@/src/schemas/tiktok.schema";

const nf = new Intl.NumberFormat("pt-BR");

const RECONNECT_CODES = new Set([
  "SOCIAL_CONNECTION_NOT_FOUND",
  "SOCIAL_SCOPE_MISSING",
  "SOCIAL_TOKEN_EXPIRED",
  "SOCIAL_PROVIDER_NOT_CONFIGURED",
]);

const PRIVACY_OPTIONS: { value: TiktokPrivacy; label: string; auditRequired?: boolean }[] = [
  { value: "SELF_ONLY", label: "Privado (só eu)" },
  { value: "FOLLOWER_OF_CREATOR", label: "Seguidores (requer auditoria TikTok)", auditRequired: true },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Amigos (requer auditoria TikTok)", auditRequired: true },
  { value: "PUBLIC_TO_EVERYONE", label: "Público (requer auditoria TikTok)", auditRequired: true },
];

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
  error: TiktokError;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-muted-foreground">
        <HugeiconsIcon icon={TiktokIcon} className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading font-semibold text-xl tracking-tight">
          Conecte o TikTok
        </h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Link href={`/${slug}/settings`} className={buttonVariants()}>
        Ir para configurações
      </Link>
    </div>
  );
}

function TiktokVideoPreview({
  displayName,
  isVerified,
  caption,
  privacy,
  filePreview,
}: {
  displayName: string;
  isVerified: boolean;
  caption: string;
  privacy: TiktokPrivacy;
  filePreview?: TikTokFilePreview | null;
}) {
  const privacyLabel =
    PRIVACY_OPTIONS.find((o) => o.value === privacy)?.label ?? privacy;

  return (
    <div className="mx-auto max-w-[300px]">
      {/* Moldura estilo smartphone */}
      <div className="relative rounded-[2.5rem] border-[5px] border-neutral-800 bg-neutral-950 shadow-2xl ring-1 ring-white/5">
        {/* Barra de status */}
        <div className="flex items-center justify-between px-5 pt-2.5 pb-1">
          <span className="text-white/50 text-[10px] font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-3.5 rounded-sm bg-white/40" />
            <div className="h-1.5 w-1 rounded-sm bg-white/40" />
            <div className="h-1.5 w-3 rounded-sm bg-white/40" />
          </div>
        </div>

        {/* Área de vídeo 9:16 */}
        <div className="relative overflow-hidden bg-neutral-900">
          <div className="aspect-[9/16] w-full">
            {/* Preview real ou placeholder */}
            {filePreview ? (
              <video
                src={filePreview.objectUrl}
                className="size-full object-cover"
                muted
                preload="metadata"
                playsInline
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 text-white/15">
                <HugeiconsIcon icon={TiktokIcon} className="size-14" />
                <span className="text-xs tracking-wide">Vídeo</span>
              </div>
            )}

            {/* Avatar do perfil + botão follow (lado direito, topo) */}
            <div className="absolute top-4 right-3 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="size-10 rounded-full border-2 border-white bg-gradient-to-br from-pink-500 to-purple-600 p-0.5">
                  <div className="size-full rounded-full bg-neutral-800" />
                </div>
                <div className="absolute -bottom-2 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full bg-[#FE2C55] text-white font-bold text-xs leading-none">
                  +
                </div>
              </div>
            </div>

            {/* Ações (lado direito, centro-baixo) */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                  <HugeiconsIcon
                    icon={FavouriteIcon}
                    className="size-[22px] text-white"
                  />
                </div>
                <span className="text-white/80 text-[11px] font-medium">0</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                  <HugeiconsIcon
                    icon={Comment01Icon}
                    className="size-[22px] text-white"
                  />
                </div>
                <span className="text-white/80 text-[11px] font-medium">0</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                  <HugeiconsIcon
                    icon={Share08Icon}
                    className="size-[22px] text-white"
                  />
                </div>
                <span className="text-white/80 text-[11px] font-medium">0</span>
              </div>
            </div>

            {/* Overlay inferior */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pt-12 pb-4">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="min-w-0 truncate font-semibold text-sm text-white drop-shadow">
                  @{displayName}
                </span>
                {isVerified && (
                  <HugeiconsIcon
                    icon={CheckmarkBadge01Icon}
                    className="size-3.5 shrink-0 text-sky-400"
                  />
                )}
              </div>
              {caption ? (
                <p className="mt-1 break-words line-clamp-2 text-white/90 text-xs leading-relaxed drop-shadow">
                  {caption}
                </p>
              ) : (
                <p className="mt-1 text-white/40 text-xs italic">
                  Legenda aqui…
                </p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <div className="size-3.5 rounded-full border border-white/60 bg-white/10" />
                <p className="text-white/60 text-[11px]">{privacyLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de navegação */}
        <div className="flex items-center justify-around px-4 pt-2 pb-3">
          <div className="h-1 w-8 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

function TiktokVideoModal({
  video,
  displayName,
  avatarUrl,
  isVerified,
}: {
  video: TiktokVideo;
  displayName: string;
  avatarUrl?: string | null;
  isVerified: boolean;
}) {
  const date = video.createdAt
    ? new Date(Number(video.createdAt) * 1000).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl md:flex-row">
      {/* Cover */}
      <div className="flex items-center justify-center bg-neutral-950 py-6 md:w-[40%] md:py-8">
        <div className="relative w-[140px] overflow-hidden rounded-2xl border border-white/10">
          <div className="aspect-[9/16] w-full">
            {video.coverImageUrl ? (
              // biome-ignore lint/performance/noImgElement: capa externa do TikTok
              <img
                src={video.coverImageUrl}
                alt={video.title}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-white/20">
                <HugeiconsIcon icon={TiktokIcon} className="size-10" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-2">
              <div className="flex items-center gap-3 text-white/80 text-[11px] tabular-nums">
                <span className="flex items-center gap-0.5">
                  <HugeiconsIcon icon={EyeIcon} className="size-3" />
                  {nf.format(video.viewCount)}
                </span>
                <span className="flex items-center gap-0.5">
                  <HugeiconsIcon icon={FavouriteIcon} className="size-3" />
                  {nf.format(video.likeCount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col justify-between gap-4 p-5 md:w-[60%]">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // biome-ignore lint/performance/noImgElement: avatar externo do TikTok
              <img
                src={avatarUrl}
                alt={displayName}
                className="size-10 rounded-full border border-border/50 object-cover"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900/10 dark:bg-white/10">
                <HugeiconsIcon icon={TiktokIcon} className="size-5" />
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">{displayName}</span>
              {isVerified && (
                <HugeiconsIcon
                  icon={CheckmarkBadge01Icon}
                  className="size-3.5 text-sky-500"
                />
              )}
            </div>
          </div>

          {video.title && (
            <p className="text-sm leading-relaxed">{video.title}</p>
          )}

          {date && (
            <p className="text-muted-foreground text-xs">{date}</p>
          )}
        </div>

        <div className="space-y-3">
          {video.shareUrl && (
            <a
              href={video.shareUrl}
              target="_blank"
              rel="noreferrer"
              className={`${buttonVariants({ size: "sm" })} block w-full text-center`}
            >
              Abrir no TikTok
            </a>
          )}

          {/* Analytics por post */}
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
            {[
              { icon: EyeIcon, label: "Visualizações", value: video.viewCount },
              { icon: FavouriteIcon, label: "Curtidas", value: video.likeCount },
              { icon: Comment01Icon, label: "Comentários", value: video.commentCount },
              { icon: Share08Icon, label: "Compart.", value: video.shareCount },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                className="flex flex-col rounded-lg border border-border/60 px-3 py-2"
              >
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <HugeiconsIcon icon={icon} className="size-3" />
                  {label}
                </span>
                <span className="font-semibold text-base tabular-nums">
                  {nf.format(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: TiktokVideo }) {
  const cover = (
    <Card className="group overflow-hidden p-0">
      <div className="relative aspect-[9/16] w-full bg-muted">
        {video.coverImageUrl ? (
          // biome-ignore lint/performance/noImgElement: capa externa do TikTok, sem host configurado em next/image
          <img
            src={video.coverImageUrl}
            alt={video.title}
            className="size-full object-cover transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <HugeiconsIcon icon={TiktokIcon} className="size-8" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-2.5 pt-6 pb-2 text-white text-xs">
          <span className="flex items-center gap-1 tabular-nums">
            <HugeiconsIcon icon={EyeIcon} className="size-3.5" />
            {nf.format(video.viewCount)}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <HugeiconsIcon icon={FavouriteIcon} className="size-3.5" />
            {nf.format(video.likeCount)}
          </span>
        </div>
      </div>
      <div className="space-y-1 px-2.5 py-2">
        <p className="line-clamp-2 font-medium text-sm leading-snug">
          {video.title}
        </p>
        <div className="flex items-center gap-3 text-muted-foreground text-xs tabular-nums">
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Comment01Icon} className="size-3" />
            {nf.format(video.commentCount)}
          </span>
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Share08Icon} className="size-3" />
            {nf.format(video.shareCount)}
          </span>
        </div>
      </div>
    </Card>
  );

  if (!video.shareUrl) return cover;
  return (
    <a
      href={video.shareUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {cover}
    </a>
  );
}

type TikTokFilePreview = { objectUrl: string; duration: string };

function TikTokVideoFileInput({
  onPreview,
}: {
  onPreview: (p: TikTokFilePreview | null) => void;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { onPreview(null); return; }
    const objectUrl = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.src = objectUrl;
    vid.onloadedmetadata = () => {
      const d = Math.round(vid.duration);
      const min = Math.floor(d / 60);
      const sec = String(d % 60).padStart(2, "0");
      onPreview({ objectUrl, duration: `${min}:${sec}` });
    };
    vid.onerror = () => { onPreview({ objectUrl, duration: "" }); };
  }

  return (
    <Input
      id="tt-file"
      name="file"
      type="file"
      accept="video/*"
      required
      onChange={handleChange}
    />
  );
}

function UploadForm({
  slug,
  publish,
  onPublished,
  caption,
  onCaptionChange,
  privacy,
  onPrivacyChange,
  disableComment,
  onDisableCommentChange,
  disableDuet,
  onDisableDuetChange,
  disableStitch,
  onDisableStitchChange,
  onPreview,
}: {
  slug: string;
  publish: ReturnType<typeof useTiktok>["publish"];
  onPublished: () => void;
  caption: string;
  onCaptionChange: (v: string) => void;
  privacy: TiktokPrivacy;
  onPrivacyChange: (v: TiktokPrivacy) => void;
  disableComment: boolean;
  onDisableCommentChange: (v: boolean) => void;
  disableDuet: boolean;
  onDisableDuetChange: (v: boolean) => void;
  disableStitch: boolean;
  onDisableStitchChange: (v: boolean) => void;
  onPreview?: (p: TikTokFilePreview | null) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [filePreview, setFilePreview] = useState<TikTokFilePreview | null>(null);

  function handlePreview(p: TikTokFilePreview | null) {
    setFilePreview(p);
    onPreview?.(p);
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Selecione um arquivo de vídeo.");
      return;
    }
    form.set("privacyLevel", privacy);
    form.set("disableComment", String(disableComment));
    form.set("disableDuet", String(disableDuet));
    form.set("disableStitch", String(disableStitch));

    setSubmitting(true);
    const result = await publish(form);
    setSubmitting(false);

    if (result.ok) {
      toast.success("Vídeo enviado ao TikTok. O processamento é assíncrono.");
      formEl.reset();
      onCaptionChange("");
      if (filePreview) URL.revokeObjectURL(filePreview.objectUrl);
      handlePreview(null);
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
          <Label htmlFor="tt-title">Legenda</Label>
          <Textarea
            id="tt-title"
            name="title"
            rows={4}
            maxLength={2200}
            placeholder="Escreva uma legenda (opcional)"
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tt-privacy">Privacidade</Label>
            <Select
              value={privacy}
              onValueChange={(v) => onPrivacyChange(v as TiktokPrivacy)}
            >
              <SelectTrigger id="tt-privacy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIVACY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} disabled={o.auditRequired}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tt-file">Arquivo de vídeo</Label>
            <TikTokVideoFileInput onPreview={handlePreview} />
          </div>
        </div>

        {filePreview && (
          <div className="relative overflow-hidden rounded-lg border border-border/60 bg-black">
            <video
              src={filePreview.objectUrl}
              className="mx-auto max-h-48 object-contain"
              muted
              preload="metadata"
            />
            {filePreview.duration && (
              <div className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-white text-xs font-medium">
                {filePreview.duration}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 rounded-lg border border-border/70 p-3">
          <ToggleRow
            label="Desativar comentários"
            checked={disableComment}
            onCheckedChange={onDisableCommentChange}
          />
          <ToggleRow
            label="Desativar Duet"
            checked={disableDuet}
            onCheckedChange={onDisableDuetChange}
          />
          <ToggleRow
            label="Desativar Stitch"
            checked={disableStitch}
            onCheckedChange={onDisableStitchChange}
          />
        </div>

        <p className="text-muted-foreground text-xs">
          Máximo 64 MB. Postar como público exige um app auditado pela TikTok —
          até lá, use Privado.
        </p>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enviando…" : "Publicar no TikTok"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label className="flex items-center justify-between gap-3 font-normal text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </Label>
  );
}

export function TiktokStudio({ slug }: { slug: string }) {
  const { overview, videos, isLoading, error, refetch, publish } =
    useTiktok(slug);

  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<TiktokPrivacy>("SELF_ONLY");
  const [selectedVideo, setSelectedVideo] = useState<TiktokVideo | null>(null);
  const [disableComment, setDisableComment] = useState(false);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<TikTokFilePreview | null>(null);

  if (isLoading && !overview) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-20" />
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
        {error?.message ?? "Não foi possível carregar a conta."}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={refetch}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const videosNeedReconnect =
    !videos && error && RECONNECT_CODES.has(error.code ?? "");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-4">
        {overview.avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar externo do TikTok, sem host configurado em next/image
          <img
            src={overview.avatarUrl}
            alt={overview.displayName}
            className="size-16 rounded-full border border-border/70"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-neutral-900/10 text-neutral-900 dark:bg-white/10 dark:text-white">
            <HugeiconsIcon icon={TiktokIcon} className="size-7" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate font-heading font-semibold text-xl tracking-tight">
              {overview.displayName}
            </h2>
            {overview.isVerified ? (
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                className="size-4 shrink-0 text-sky-500"
              />
            ) : null}
          </div>
          {overview.bio ? (
            <p className="line-clamp-1 text-muted-foreground text-sm">
              {overview.bio}
            </p>
          ) : null}
          {overview.profileLink ? (
            <a
              href={overview.profileLink}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              Abrir perfil
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={UserMultipleIcon}
              label="Seguidores"
              value={overview.followerCount}
            />
            <StatCard
              icon={UserGroupIcon}
              label="Seguindo"
              value={overview.followingCount}
            />
            <StatCard
              icon={FavouriteIcon}
              label="Curtidas"
              value={overview.likesCount}
            />
            <StatCard
              icon={Album02Icon}
              label="Vídeos"
              value={overview.videoCount}
            />
          </div>

          {videosNeedReconnect ? (
            <Card className="px-4 py-6 text-center text-muted-foreground text-sm">
              {error?.message}
            </Card>
          ) : videos ? (
            videos.videos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {videos.videos.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setSelectedVideo(video)}
                    className="block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <VideoCard video={video} />
                  </button>
                ))}
              </div>
            ) : (
              <Card className="px-4 py-10 text-center text-muted-foreground text-sm">
                <HugeiconsIcon
                  icon={TiktokIcon}
                  className="mx-auto mb-2 size-6 opacity-60"
                />
                Nenhum vídeo recente.
              </Card>
            )
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
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
                onPublished={() => { setUploadPreview(null); refetch(); }}
                caption={caption}
                onCaptionChange={setCaption}
                privacy={privacy}
                onPrivacyChange={setPrivacy}
                disableComment={disableComment}
                onDisableCommentChange={setDisableComment}
                disableDuet={disableDuet}
                onDisableDuetChange={setDisableDuet}
                disableStitch={disableStitch}
                onDisableStitchChange={setDisableStitch}
                onPreview={setUploadPreview}
              />
            </div>
            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base tracking-tight text-muted-foreground">
                Pré-visualização
              </h3>
              <TiktokVideoPreview
                displayName={overview.displayName}
                isVerified={overview.isVerified}
                caption={caption}
                privacy={privacy}
                filePreview={uploadPreview}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {videosNeedReconnect ? (
            <Card className="px-4 py-6 text-center text-muted-foreground text-sm">
              {error?.message}
            </Card>
          ) : videos ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  icon={EyeIcon}
                  label="Visualizações"
                  value={videos.totals.views}
                />
                <StatCard
                  icon={FavouriteIcon}
                  label="Curtidas"
                  value={videos.totals.likes}
                />
                <StatCard
                  icon={Comment01Icon}
                  label="Comentários"
                  value={videos.totals.comments}
                />
                <StatCard
                  icon={Share08Icon}
                  label="Compart."
                  value={videos.totals.shares}
                />
              </div>

              <Card className="px-4 py-6 text-center text-muted-foreground text-sm">
                <HugeiconsIcon
                  icon={Analytics01Icon}
                  className="mx-auto mb-2 size-6 opacity-60"
                />
                A API do TikTok não fornece séries temporais de analytics.
                Métricas acima referem-se aos vídeos recentes.
              </Card>
            </>
          ) : (
            <Skeleton className="h-48 w-full" />
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={selectedVideo !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedVideo(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl gap-0 p-0 overflow-hidden">
          {selectedVideo && (
            <TiktokVideoModal
              video={selectedVideo}
              displayName={overview.displayName}
              avatarUrl={overview.avatarUrl}
              isVerified={overview.isVerified}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
