"use client";

import {
  Comment01Icon,
  EyeIcon,
  FavouriteIcon,
  FireIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { SOCIAL_PLATFORM_META } from "@/components/social-platforms";
import { useResourceList } from "@/src/hooks/use-resource-list";
import type { TrendingItem } from "@/src/schemas/social-trending.schema";

const nf = new Intl.NumberFormat("pt-BR");

function TrendingCard({ item, rank }: { item: TrendingItem; rank: number }) {
  const meta = SOCIAL_PLATFORM_META.find((p) => p.platform === item.platform);

  const card = (
    <Card className="group relative overflow-hidden p-0">
      <span className="absolute top-2 left-2 z-10 flex size-6 items-center justify-center rounded-full bg-black/70 font-semibold text-white text-xs">
        {rank}
      </span>
      {meta ? (
        <span
          className={`absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full text-white ${meta.color}`}
        >
          <HugeiconsIcon icon={meta.icon} className="size-3.5" />
        </span>
      ) : null}
      <div className="aspect-square w-full bg-muted">
        {item.thumbnailUrl ? (
          // biome-ignore lint/performance/noImgElement: capa externa da rede social
          <img
            src={item.thumbnailUrl}
            alt={item.caption ?? ""}
            className="size-full object-cover transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/30">
            <HugeiconsIcon icon={FireIcon} className="size-8" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5 text-[11px] text-white">
          {item.views !== null ? (
            <span className="flex items-center gap-1 tabular-nums">
              <HugeiconsIcon icon={EyeIcon} className="size-3" />
              {nf.format(item.views)}
            </span>
          ) : null}
          <span className="flex items-center gap-1 tabular-nums">
            <HugeiconsIcon icon={FavouriteIcon} className="size-3" />
            {nf.format(item.likes)}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <HugeiconsIcon icon={Comment01Icon} className="size-3" />
            {nf.format(item.comments)}
          </span>
          {item.shares !== null ? (
            <span className="flex items-center gap-1 tabular-nums">
              <HugeiconsIcon icon={Share08Icon} className="size-3" />
              {nf.format(item.shares)}
            </span>
          ) : null}
        </div>
      </div>
      {item.caption ? (
        <p className="line-clamp-2 px-2.5 py-2 text-sm leading-snug">
          {item.caption}
        </p>
      ) : null}
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

export function TrendingFeed({ slug }: { slug: string }) {
  const { items, isLoading } = useResourceList<TrendingItem>(
    slug,
    "social/trending",
  );

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={FireIcon} className="size-5 text-red-500" />
          <h2 className="font-heading font-semibold text-xl tracking-tight">
            Em Alta — feed de hoje
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Posts publicados hoje nas suas contas conectadas, ranqueados por
          velocidade de engajamento: quanto mais views/interações em menos
          tempo, mais em alta.
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="aspect-square" />
            <Skeleton className="aspect-square" />
            <Skeleton className="aspect-square" />
            <Skeleton className="aspect-square" />
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item, i) => (
              <TrendingCard key={`${item.platform}-${item.id}`} item={item} rank={i + 1} />
            ))}
          </div>
        ) : (
          <Card className="px-4 py-10 text-center text-muted-foreground text-sm">
            <HugeiconsIcon
              icon={FireIcon}
              className="mx-auto mb-2 size-6 opacity-60"
            />
            Nenhum post publicado hoje ainda.
          </Card>
        )}
      </div>
    </PageShell>
  );
}
