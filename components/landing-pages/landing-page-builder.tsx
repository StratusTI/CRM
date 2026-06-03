"use client";

import {
  Analytics01Icon,
  ArrowLeft02Icon,
  BrowserIcon,
  Globe02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { LandingPageChat } from "@/components/landing-pages/landing-page-chat";
import { LandingPageMetricsPanel } from "@/components/landing-pages/landing-page-metrics-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { withBasePath } from "@/lib/api-url";
import { cn } from "@/lib/utils";
import { saveLandingPage, useLandingPage } from "@/src/hooks/use-landing-page";
import type {
  LandingPageDTO,
  LandingPageStatus,
} from "@/src/schemas/landing-page.schema";

export function LandingPageBuilder({
  slug,
  pageId,
}: {
  slug: string;
  pageId: string;
}) {
  const { page, isLoading, error } = useLandingPage(slug, pageId);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="ml-auto h-8 w-24" />
        </div>
        <div className="flex flex-1 gap-0">
          <Skeleton className="m-3 h-full w-80" />
          <Skeleton className="m-3 h-full flex-1" />
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        {error ?? "Página não encontrada."}
      </div>
    );
  }

  return <LandingPageBuilderInner slug={slug} initial={page} />;
}

function LandingPageBuilderInner({
  slug,
  initial,
}: {
  slug: string;
  initial: LandingPageDTO;
}) {
  const router = useRouter();

  const [title, setTitle] = React.useState(initial.title);
  const [status, setStatus] = React.useState<LandingPageStatus>(initial.status);
  const [html, setHtml] = React.useState(initial.html);
  const [publishing, setPublishing] = React.useState(false);
  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [publicUrl, setPublicUrl] = React.useState("");

  React.useEffect(() => {
    setPublicUrl(
      `${window.location.origin}${withBasePath(`/${slug}/pages/${initial.slug}`)}`,
    );
  }, [slug, initial.slug]);

  /* ----------------------------- autosave título ---------------------- */
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onTitleChange = (next: string) => {
    setTitle(next);
    if (!next.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const saved = await saveLandingPage(slug, initial.id, {
        title: next.trim(),
      });
      if (!saved) toast.error("Não foi possível salvar o título.");
    }, 600);
  };

  const onToggleStatus = async (online: boolean) => {
    const next: LandingPageStatus = online ? "PUBLISHED" : "DRAFT";
    setStatus(next);
    setPublishing(true);
    const saved = await saveLandingPage(slug, initial.id, { status: next });
    setPublishing(false);
    if (saved) {
      toast.success(online ? "Página publicada" : "Página despublicada");
    } else {
      setStatus(online ? "DRAFT" : "PUBLISHED"); // reverte otimismo
      toast.error("Não foi possível alterar a publicação.");
    }
  };

  const online = status === "PUBLISHED";

  return (
    <div className="flex h-full flex-col">
      {/* topbar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Voltar"
          onClick={() => router.push(`/${slug}/marketing/pages`)}
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
        </Button>
        <HugeiconsIcon
          icon={BrowserIcon}
          strokeWidth={2}
          className="size-4 shrink-0 text-muted-foreground"
        />
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Página sem título"
          aria-label="Título da página"
          className="min-w-0 flex-1 bg-transparent font-semibold text-sm outline-none placeholder:text-muted-foreground/60"
        />

        <Button variant="ghost" size="sm" onClick={() => setMetricsOpen(true)}>
          <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} />
          Métricas
        </Button>

        {online ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
                Visualizar
              </a>
            }
          />
        ) : null}

        <div className="flex items-center gap-2 pl-1">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs",
              online
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {online ? "Online" : "Offline"}
          </span>
          <Switch
            checked={online}
            disabled={publishing}
            onCheckedChange={onToggleStatus}
            aria-label="Publicar página"
          />
        </div>
      </header>

      {/* corpo: chat (esquerda) + preview (direita, maior) */}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[360px] shrink-0 flex-col border-r">
          <LandingPageChat
            slug={slug}
            pageId={initial.id}
            hasContent={html.trim().length > 0}
            onHtml={setHtml}
          />
        </aside>
        <main className="min-w-0 flex-1 bg-muted/30 p-3">
          {html.trim() ? (
            <iframe
              title="Pré-visualização da página"
              srcDoc={html}
              sandbox="allow-scripts allow-same-origin"
              className="h-full w-full rounded-lg border bg-white"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-muted-foreground text-sm">
              <HugeiconsIcon
                icon={BrowserIcon}
                strokeWidth={2}
                className="size-8 opacity-40"
              />
              <p className="max-w-xs">
                Sua página aparecerá aqui. Descreva no chat ao lado o que você
                quer criar.
              </p>
            </div>
          )}
        </main>
      </div>

      <LandingPageMetricsPanel
        slug={slug}
        pageId={initial.id}
        open={metricsOpen}
        onOpenChange={setMetricsOpen}
      />
    </div>
  );
}
