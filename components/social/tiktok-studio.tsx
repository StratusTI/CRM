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
import { Textarea } from "@/components/ui/textarea";
import { type TiktokError, useTiktok } from "@/src/hooks/use-tiktok";
import type { TiktokPrivacy, TiktokVideo } from "@/src/schemas/tiktok.schema";

const nf = new Intl.NumberFormat("pt-BR");

/** Códigos que significam "precisa (re)conectar a conta nas configurações". */
const RECONNECT_CODES = new Set([
  "SOCIAL_CONNECTION_NOT_FOUND",
  "SOCIAL_SCOPE_MISSING",
  "SOCIAL_TOKEN_EXPIRED",
  "SOCIAL_PROVIDER_NOT_CONFIGURED",
]);

const PRIVACY_OPTIONS: { value: TiktokPrivacy; label: string }[] = [
  { value: "SELF_ONLY", label: "Privado (só eu)" },
  { value: "FOLLOWER_OF_CREATOR", label: "Seguidores" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Amigos" },
  { value: "PUBLIC_TO_EVERYONE", label: "Público" },
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

export function TiktokStudio({ slug }: { slug: string }) {
  const { overview, videos, isLoading, error, refetch, publish } =
    useTiktok(slug);

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
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      {/* Cabeçalho do criador */}
      <header className="flex items-center gap-4">
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

      {/* Vídeos recentes */}
      <section className="space-y-4">
        <h3 className="font-heading font-semibold text-lg tracking-tight">
          Vídeos recentes
        </h3>

        {videosNeedReconnect ? (
          <Card className="px-4 py-6 text-center text-muted-foreground text-sm">
            {error?.message}
          </Card>
        ) : videos ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={EyeIcon}
                label="Visualizações (recentes)"
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

            {videos.videos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {videos.videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <Card className="px-4 py-10 text-center text-muted-foreground text-sm">
                <HugeiconsIcon
                  icon={Analytics01Icon}
                  className="mx-auto mb-2 size-6 opacity-60"
                />
                Nenhum vídeo recente.
              </Card>
            )}
          </>
        ) : (
          <Skeleton className="h-72 w-full" />
        )}
      </section>

      {/* Publicar */}
      <UploadForm slug={slug} publish={publish} onPublished={refetch} />
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

function UploadForm({
  slug,
  publish,
  onPublished,
}: {
  slug: string;
  publish: ReturnType<typeof useTiktok>["publish"];
  onPublished: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [privacy, setPrivacy] = useState<TiktokPrivacy>("SELF_ONLY");
  const [disableComment, setDisableComment] = useState(false);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Selecione um arquivo de vídeo.");
      return;
    }
    // Os toggles e a privacidade são controlados — anexa explicitamente.
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
    <section className="space-y-4">
      <h3 className="font-heading font-semibold text-lg tracking-tight">
        Publicar vídeo
      </h3>
      <Card className="p-4 sm:p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="tt-title">Legenda</Label>
            <Textarea
              id="tt-title"
              name="title"
              rows={3}
              maxLength={2200}
              placeholder="Escreva uma legenda (opcional)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tt-privacy">Privacidade</Label>
              <Select
                value={privacy}
                onValueChange={(v) => setPrivacy(v as TiktokPrivacy)}
              >
                <SelectTrigger id="tt-privacy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIVACY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tt-file">Arquivo de vídeo</Label>
              <Input
                id="tt-file"
                name="file"
                type="file"
                accept="video/*"
                required
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-3">
            <ToggleRow
              label="Desativar comentários"
              checked={disableComment}
              onCheckedChange={setDisableComment}
            />
            <ToggleRow
              label="Desativar Duet"
              checked={disableDuet}
              onCheckedChange={setDisableDuet}
            />
            <ToggleRow
              label="Desativar Stitch"
              checked={disableStitch}
              onCheckedChange={setDisableStitch}
            />
          </div>

          <p className="text-muted-foreground text-xs">
            Máximo 64 MB. Postar como público exige um app auditado pela TikTok
            — até lá, use Privado.
          </p>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Publicar no TikTok"}
            </Button>
          </div>
        </form>
      </Card>
    </section>
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
