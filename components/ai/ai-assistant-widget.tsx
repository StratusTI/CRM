"use client";

import {
  Add01Icon,
  AiChat02Icon,
  Cancel01Icon,
  Delete02Icon,
  Loading03Icon,
  MessageMultiple01Icon,
  Sent02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type UiMessage, useAiAssistant } from "@/src/hooks/use-ai-assistant";

const SUGGESTIONS = [
  "Qual o valor total do meu pipeline por estágio?",
  "Como estão minhas propostas? Quais têm mais visualizações?",
  "Resuma o desempenho das campanhas de e-mail recentes.",
  "Compare o engajamento das redes sociais conectadas.",
  "Quais tarefas estão atrasadas e quem é o responsável?",
];

/** Nomes legíveis para cada ferramenta consultada. */
const TOOL_LABELS: Record<string, string> = {
  get_workspace_overview: "visão geral",
  list_companies: "empresas",
  list_people: "contatos",
  list_opportunities: "oportunidades",
  list_tasks: "tarefas",
  list_notes: "notas",
  list_dashboards: "dashboards",
  list_proposals: "propostas",
  get_proposal_metrics: "métricas de proposta",
  list_email_campaigns: "campanhas de e-mail",
  get_email_campaign_details: "detalhes de campanha",
  get_instagram_overview: "Instagram",
  get_instagram_insights: "insights Instagram",
  get_facebook_overview: "Facebook",
  get_facebook_insights: "insights Facebook",
  get_youtube_overview: "YouTube",
  get_youtube_insights: "insights YouTube",
  get_tiktok_overview: "TikTok",
  get_tiktok_videos: "vídeos TikTok",
  get_twitter_overview: "X (Twitter)",
  get_google_analytics_overview: "Google Analytics",
  get_google_analytics_insights: "insights GA4",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, " ");
}

export function AiAssistantWidget({
  slug,
  userName,
}: {
  slug: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && <Launcher onClick={() => setOpen(true)} />}
      {open && (
        <ChatPanel
          slug={slug}
          userName={userName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Launcher({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir assistente de IA"
      className="fixed right-4 bottom-4 z-50 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-black/10 transition-all hover:brightness-110 active:translate-y-px [&_svg]:size-6"
    >
      <HugeiconsIcon icon={AiChat02Icon} />
    </button>
  );
}

function ChatPanel({
  slug,
  userName,
  onClose,
}: {
  slug: string;
  userName: string;
  onClose: () => void;
}) {
  const ai = useAiAssistant(slug);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao mudar mensagens/streaming/thinking
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [ai.messages, ai.isStreaming, ai.thinkingTools]);

  function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next) ai.refreshList();
  }

  function submit() {
    const text = draft.trim();
    if (!text || ai.isStreaming) return;
    setDraft("");
    ai.sendMessage(text);
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex h-[620px] max-h-[calc(100svh-2rem)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card/80 px-3 py-2.5 backdrop-blur">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-4">
          <HugeiconsIcon icon={SparklesIcon} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Assistente
          </p>
          <p className="truncate text-xs text-muted-foreground leading-tight">
            Analisa dados do workspace em tempo real
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Histórico de conversas"
          aria-pressed={showHistory}
          onClick={toggleHistory}
        >
          <HugeiconsIcon icon={MessageMultiple01Icon} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Nova conversa"
          onClick={() => {
            ai.startNew();
            setShowHistory(false);
          }}
        >
          <HugeiconsIcon icon={Add01Icon} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Fechar"
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
      </header>

      {showHistory ? (
        <HistoryList ai={ai} onPick={() => setShowHistory(false)} />
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
        >
          {ai.isLoadingConversation ? (
            <p className="text-center text-sm text-muted-foreground">
              Carregando…
            </p>
          ) : ai.messages.length === 0 ? (
            <EmptyState
              userName={userName}
              onPick={(s) => {
                setDraft("");
                ai.sendMessage(s);
              }}
            />
          ) : (
            ai.messages.map((m, i) => {
              const isLastAssistant =
                ai.isStreaming &&
                i === ai.messages.length - 1 &&
                m.role === "assistant";
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  streaming={isLastAssistant}
                  thinkingTools={isLastAssistant ? ai.thinkingTools : []}
                />
              );
            })
          )}
          {ai.error && (
            <p className="text-center text-xs text-destructive">{ai.error}</p>
          )}
        </div>
      )}

      {!showHistory && (
        <div className="shrink-0 border-t border-border p-2.5">
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Escreva sua mensagem…"
              rows={1}
              className="max-h-28 min-h-9 flex-1 resize-none"
            />
            <Button
              size="icon"
              aria-label="Enviar"
              disabled={!draft.trim() || ai.isStreaming}
              onClick={submit}
            >
              <HugeiconsIcon
                icon={ai.isStreaming ? Loading03Icon : Sent02Icon}
                className={cn(ai.isStreaming && "animate-spin")}
              />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  userName,
  onPick,
}: {
  userName: string;
  onPick: (s: string) => void;
}) {
  const firstName = userName.split(" ")[0] || "por aqui";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary [&_svg]:size-6">
        <HugeiconsIcon icon={SparklesIcon} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">Olá, {firstName} 👋</p>
        <p className="text-xs text-muted-foreground">
          Consulto dados reais do workspace — CRM, propostas, campanhas de
          e-mail, redes sociais e Google Analytics — para análises embasadas.
        </p>
      </div>
      <div className="flex w-full flex-col gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator({ tools }: { tools: string[] }) {
  const labels = tools.map(toolLabel);
  return (
    <div className="flex items-start gap-1.5">
      <HugeiconsIcon
        icon={SparklesIcon}
        className="mt-0.5 size-3.5 shrink-0 animate-pulse text-primary"
      />
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">
          Consultando workspace…
        </p>
        <p className="text-xs text-muted-foreground/70">
          {labels.join("  ·  ")}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  streaming,
  thinkingTools,
}: {
  message: UiMessage;
  streaming: boolean;
  thinkingTools: string[];
}) {
  const isUser = message.role === "user";
  const showThinking = !isUser && streaming && thinkingTools.length > 0;
  const showEmptyCursor =
    !isUser && streaming && !showThinking && message.content === "";

  return (
    <div className={cn("flex gap-2", isUser && "justify-end")}>
      {!isUser && (
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-3.5">
          <HugeiconsIcon
            icon={SparklesIcon}
            className={cn(showThinking && "animate-pulse")}
          />
        </span>
      )}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {showThinking ? (
          <ThinkingIndicator tools={thinkingTools} />
        ) : (
          <>
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.8em] [&_code]:font-mono dark:[&_code]:bg-white/15 [&_pre]:rounded-lg [&_pre]:bg-black/10 [&_pre]:p-3 dark:[&_pre]:bg-white/10 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-1 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_blockquote]:border-l-2 [&_blockquote]:border-current [&_blockquote]:pl-3 [&_blockquote]:opacity-70 [&_strong]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_hr]:border-current [&_hr]:opacity-20 [&_table]:w-full [&_th]:text-left [&_th]:font-medium [&_td]:py-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
            {showEmptyCursor && (
              <span className="inline-block size-3.5 animate-pulse rounded-full bg-current align-middle opacity-60" />
            )}
            {streaming && !showEmptyCursor && (
              <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-current align-middle" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HistoryList({
  ai,
  onPick,
}: {
  ai: ReturnType<typeof useAiAssistant>;
  onPick: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {ai.conversations.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-muted-foreground">
          Nenhuma conversa ainda.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {ai.conversations.map((c) => (
            <li key={c.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  ai.openConversation(c.id);
                  onPick();
                }}
                className={cn(
                  "flex-1 truncate rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                  ai.activeId === c.id && "bg-muted",
                )}
              >
                {c.title || "Conversa"}
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Excluir conversa"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => ai.deleteConversation(c.id)}
              >
                <HugeiconsIcon icon={Delete02Icon} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
