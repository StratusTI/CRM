"use client";

import {
  Analytics01Icon,
  Cancel01Icon,
  Cursor02Icon,
  Globe02Icon,
  Timer02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getLandingPageMetrics } from "@/src/hooks/use-landing-page";
import type { LandingPageMetricsDTO } from "@/src/schemas/landing-page.schema";

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

/** Rótulo legível da origem do tráfego (host do referrer ou "Direto"). */
function referrerLabel(referrer: string | null): string {
  if (!referrer) return "Direto / desconhecido";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: IconSvgElement;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 font-semibold text-lg tabular-nums">{value}</div>
    </div>
  );
}

export function LandingPageMetricsPanel({
  slug,
  pageId,
  open,
  onOpenChange,
  onLoaded,
}: {
  slug: string;
  pageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Propaga as métricas carregadas (ex.: para o resumo da sidebar). */
  onLoaded?: (metrics: LandingPageMetricsDTO) => void;
}) {
  const [metrics, setMetrics] = useState<LandingPageMetricsDTO | null>(null);
  const [loading, setLoading] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: carrega ao abrir
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getLandingPageMetrics(slug, pageId)
      .then((data) => {
        if (data) {
          setMetrics(data);
          onLoaded?.(data);
        }
      })
      .finally(() => setLoading(false));
  }, [open, slug, pageId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-[480px] !max-w-[480px] overflow-auto p-0"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} />
          <span className="font-semibold text-sm">Métricas da página</span>
          <SheetClose
            className="ml-auto"
            nativeButton={true}
            render={
              <Button variant="ghost" size="icon-sm">
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            }
          />
        </div>

        <div className="space-y-4 p-3">
          {loading && <Skeleton className="h-24 w-full" />}

          {!loading && metrics && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <SummaryCard
                  icon={Analytics01Icon}
                  label="Acessos"
                  value={metrics.totalViews.toLocaleString("pt-BR")}
                />
                <SummaryCard
                  icon={Timer02Icon}
                  label="Tempo médio"
                  value={formatDuration(metrics.avgDurationMs)}
                />
                <SummaryCard
                  icon={Cursor02Icon}
                  label="Cliques em CTA"
                  value={metrics.totalCtaClicks.toLocaleString("pt-BR")}
                />
                <SummaryCard
                  icon={Globe02Icon}
                  label="Origens"
                  value={metrics.referrers.length.toLocaleString("pt-BR")}
                />
              </div>

              <div>
                <h3 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Origem do tráfego
                </h3>
                {metrics.referrers.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground text-sm">
                    Nenhum acesso registrado ainda. Publique a página e
                    compartilhe o link para começar a coletar métricas.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {metrics.referrers.map((ref) => (
                      <li
                        key={ref.referrer ?? "direct"}
                        className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                      >
                        <HugeiconsIcon
                          icon={Globe02Icon}
                          strokeWidth={2}
                          className="size-3.5 shrink-0 text-muted-foreground"
                        />
                        <span className="min-w-0 truncate">
                          {referrerLabel(ref.referrer)}
                        </span>
                        <span className="ml-auto text-muted-foreground tabular-nums">
                          {ref.count.toLocaleString("pt-BR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
