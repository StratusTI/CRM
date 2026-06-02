"use client";

import {
  Analytics01Icon,
  ArrowLeft02Icon,
  File01Icon,
  Globe02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ProposalAiMenu } from "@/components/proposals/proposal-ai-menu";
import { ProposalMetricsDrawer } from "@/components/proposals/proposal-metrics-drawer";
import { ProposalOptionsMenu } from "@/components/proposals/proposal-options-menu";
import { ProposalSidebar } from "@/components/proposals/proposal-sidebar";
import { ProposalToolbar } from "@/components/proposals/proposal-toolbar";
import { analyzeDoc, type DocStats } from "@/components/rich-text/analyze";
import { RICH_TEXT_EXTENSIONS } from "@/components/rich-text/tiptap-extensions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/api-url";
import { saveProposal, useProposal } from "@/src/hooks/use-proposal";
import type {
  ProposalDTO,
  ProposalMetricsDTO,
  ProposalStatus,
  UpdateProposalInput,
} from "@/src/schemas/proposal.schema";

const EMPTY_STATS: DocStats = {
  words: 0,
  readingMinutes: 0,
  headings: 0,
  media: 0,
};

export function ProposalEditor({
  slug,
  proposalId,
}: {
  slug: string;
  proposalId: string;
}) {
  const { proposal, isLoading, error } = useProposal(slug, proposalId);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="ml-auto h-8 w-24" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="mx-auto h-full w-full max-w-3xl" />
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        {error ?? "Proposta não encontrada."}
      </div>
    );
  }

  return <ProposalEditorInner slug={slug} initial={proposal} />;
}

function ProposalEditorInner({
  slug,
  initial,
}: {
  slug: string;
  initial: ProposalDTO;
}) {
  const router = useRouter();

  const [title, setTitle] = React.useState(initial.title);
  const [status, setStatus] = React.useState<ProposalStatus>(initial.status);
  const [stats, setStats] = React.useState<DocStats>(EMPTY_STATS);
  const [publishing, setPublishing] = React.useState(false);
  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [metrics, setMetrics] = React.useState<ProposalMetricsDTO | null>(null);
  const [shareUrl, setShareUrl] = React.useState("");

  React.useEffect(() => {
    setShareUrl(
      `${window.location.origin}${withBasePath(`/p/${initial.shareToken}`)}`,
    );
  }, [initial.shareToken]);

  /* ----------------------------- autosave ----------------------------- */
  const pending = React.useRef<UpdateProposalInput>({});
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = React.useCallback(
    (patch: UpdateProposalInput) => {
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const toSave = pending.current;
        pending.current = {};
        const saved = await saveProposal(slug, initial.id, toSave);
        if (!saved) toast.error("Não foi possível salvar a proposta.");
      }, 600);
    },
    [slug, initial.id],
  );

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  /* ------------------------------ editor ------------------------------- */
  const editor = useEditor({
    extensions: RICH_TEXT_EXTENSIONS,
    content: initial.content || "",
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "tiptap min-h-full focus:outline-none" },
    },
    onCreate: ({ editor }) => setStats(analyzeDoc(editor)),
    onUpdate: ({ editor }) => {
      setStats(analyzeDoc(editor));
      scheduleSave({ content: editor.getHTML() });
    },
  });

  /* ------------------------------ metrics ------------------------------ */
  // biome-ignore lint/correctness/useExhaustiveDependencies: carrega o resumo uma vez
  React.useEffect(() => {
    import("@/src/hooks/use-proposal").then(({ getProposalMetrics }) =>
      getProposalMetrics(slug, initial.id).then((m) => m && setMetrics(m)),
    );
  }, [slug, initial.id]);

  /* ------------------------------ actions ------------------------------ */
  const onTitleChange = (next: string) => {
    setTitle(next);
    if (next.trim()) scheduleSave({ title: next.trim() });
  };

  const onToggleStatus = async (online: boolean) => {
    const next: ProposalStatus = online ? "PUBLISHED" : "DRAFT";
    setStatus(next);
    setPublishing(true);
    const saved = await saveProposal(slug, initial.id, { status: next });
    setPublishing(false);
    if (saved) {
      toast.success(online ? "Proposta publicada" : "Proposta despublicada");
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
          onClick={() => router.push(`/${slug}/proposals`)}
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
        </Button>
        <HugeiconsIcon
          icon={File01Icon}
          strokeWidth={2}
          className="size-4 shrink-0 text-muted-foreground"
        />
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Proposta sem título"
          aria-label="Título da proposta"
          className="min-w-0 flex-1 bg-transparent font-semibold text-sm outline-none placeholder:text-muted-foreground/60"
        />
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
        {online ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
                Visualizar
              </a>
            }
          />
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => setMetricsOpen(true)}>
          <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} />
          Métricas
        </Button>
        {editor ? (
          <ProposalAiMenu
            editor={editor}
            slug={slug}
            proposalId={initial.id}
            onTitleChange={onTitleChange}
          />
        ) : null}
        {editor ? (
          <ProposalOptionsMenu editor={editor} slug={slug} title={title} />
        ) : null}
      </header>

      {/* toolbar do TipTap */}
      <div className="flex shrink-0 items-center overflow-x-auto border-b px-3 py-1.5">
        {editor ? <ProposalToolbar editor={editor} /> : null}
      </div>

      {/* corpo: editor + sidebar */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="px-8 py-8">
            {editor ? <EditorContent editor={editor} /> : null}
          </div>
        </div>
        <ProposalSidebar
          stats={stats}
          status={status}
          publishing={publishing}
          onToggleStatus={onToggleStatus}
          shareUrl={shareUrl}
          metrics={metrics}
          onOpenMetrics={() => setMetricsOpen(true)}
        />
      </div>

      <ProposalMetricsDrawer
        slug={slug}
        proposalId={initial.id}
        open={metricsOpen}
        onOpenChange={setMetricsOpen}
        onLoaded={setMetrics}
      />
    </div>
  );
}
