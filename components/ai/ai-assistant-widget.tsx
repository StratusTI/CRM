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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type UiMessage, useAiAssistant } from "@/src/hooks/use-ai-assistant";

const SUGGESTIONS = [
  "Quantas empresas e oportunidades abertas eu tenho?",
  "Resuma minhas tarefas pendentes.",
  "Qual o valor total do meu pipeline por estágio?",
];

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao mudar mensagens/streaming
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [ai.messages, ai.isStreaming]);

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
    <div className="fixed right-4 bottom-4 z-50 flex h-[600px] max-h-[calc(100svh-2rem)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card/80 px-3 py-2.5 backdrop-blur">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-4">
          <HugeiconsIcon icon={SparklesIcon} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Assistente
          </p>
          <p className="truncate text-xs text-muted-foreground leading-tight">
            Pergunte sobre este workspace
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
            ai.messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                streaming={
                  ai.isStreaming &&
                  i === ai.messages.length - 1 &&
                  m.role === "assistant"
                }
              />
            ))
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
          Sou seu assistente. Posso consultar empresas, contatos, oportunidades,
          tarefas e notas deste workspace.
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

function MessageBubble({
  message,
  streaming,
}: {
  message: UiMessage;
  streaming: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "justify-end")}>
      {!isUser && (
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-3.5">
          <HugeiconsIcon icon={SparklesIcon} />
        </span>
      )}
      <div
        className={cn(
          "max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {message.content}
        {streaming && message.content === "" ? (
          <span className="inline-block size-3.5 animate-pulse rounded-full bg-current align-middle opacity-60" />
        ) : (
          streaming && (
            <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-current align-middle" />
          )
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
