"use client";

import {
  Loading03Icon,
  Sent02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";
import type { LandingPageMessageDTO } from "@/src/schemas/landing-page.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

type UiMessage = { id: string; role: "user" | "assistant"; content: string };

/** Eventos SSE emitidos pela rota de geração. */
type GenEvent =
  | { type: "text"; delta: string }
  | { type: "done"; html: string; message: LandingPageMessageDTO }
  | { type: "error"; message: string };

const SUGGESTIONS = [
  "Crie uma landing page para o lançamento de um SaaS de gestão financeira, com hero, benefícios, planos e um CTA para teste grátis.",
  "Página de captura para um e-book gratuito sobre marketing digital, com formulário e prova social.",
  "Landing de evento: workshop presencial de vendas, com agenda, palestrantes e botão de inscrição.",
];

let tempCounter = 0;
const tempId = () => `tmp-${Date.now()}-${tempCounter++}`;

/**
 * Chat do construtor de landing pages. Conversa com a IA via SSE; a cada
 * resposta concluída, repassa o HTML gerado ao builder (`onHtml`) para atualizar
 * o preview ao vivo.
 */
export function LandingPageChat({
  slug,
  pageId,
  hasContent,
  onHtml,
}: {
  slug: string;
  pageId: string;
  /** Indica se a página já tem HTML (muda o texto do estado vazio). */
  hasContent: boolean;
  onHtml: (html: string) => void;
}) {
  const [messages, setMessages] = React.useState<UiMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const baseUrl = apiUrl(
    `/api/workspaces/${slug}/marketing/pages/${pageId}/ai`,
  );

  // Carrega o histórico do chat ao montar.
  React.useEffect(() => {
    fetch(baseUrl)
      .then((res) => res.json())
      .then((json: ApiResponse<LandingPageMessageDTO[]>) => {
        if (json.success && json.data) {
          setMessages(
            json.data.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            })),
          );
        }
      })
      .catch(() => {});
  }, [baseUrl]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao mudar msgs
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = React.useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isStreaming) return;

      setError(null);
      setInput("");
      setIsStreaming(true);

      const assistantId = tempId();
      setMessages((prev) => [
        ...prev,
        { id: tempId(), role: "user", content },
        { id: assistantId, role: "assistant", content: "" },
      ]);

      const setAssistant = (updater: (cur: string) => string) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: updater(m.content) } : m,
          ),
        );

      try {
        const res = await fetch(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
        });

        if (!res.ok || !res.body) {
          const json = (await res
            .json()
            .catch(() => null)) as ApiResponse<unknown> | null;
          throw new Error(json?.message ?? "Não foi possível gerar a página.");
        }

        let sawText = false;
        await consumeStream(res.body, (event) => {
          if (event.type === "text") {
            // O texto cru é o HTML em construção; não poluímos o chat com ele.
            // Mostramos um indicador de progresso até o `done`.
            if (!sawText) {
              sawText = true;
              setAssistant(() => "Gerando a página…");
            }
          } else if (event.type === "done") {
            onHtml(event.html);
            setAssistant(() => event.message.content);
          } else if (event.type === "error") {
            setError(event.message);
            setAssistant((cur) => cur || `⚠️ ${event.message}`);
          }
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erro inesperado.";
        setError(message);
        setAssistant((cur) => cur || `⚠️ ${message}`);
      } finally {
        setIsStreaming(false);
      }
    },
    [baseUrl, isStreaming, onHtml],
  );

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
      >
        {empty ? (
          <div className="flex h-full flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
              {hasContent
                ? "Descreva as mudanças que quer fazer na página."
                : "Descreva a landing page que você quer criar."}
            </div>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="block w-full rounded-md border bg-card px-3 py-2 text-left text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.content || (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? (
        <p className="px-3 pb-1 text-destructive text-xs">{error}</p>
      ) : null}

      <form
        className="flex shrink-0 items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={
            hasContent ? "Peça uma mudança…" : "Descreva sua página…"
          }
          rows={2}
          disabled={isStreaming}
          className="max-h-32 min-h-0 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isStreaming || !input.trim()}
          aria-label="Enviar"
        >
          <HugeiconsIcon
            icon={isStreaming ? Loading03Icon : Sent02Icon}
            strokeWidth={2}
            className={cn(isStreaming && "animate-spin")}
          />
        </Button>
      </form>
    </div>
  );
}

/** Lê o corpo SSE e chama `onEvent` para cada `data: {...}`. */
async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: GenEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as GenEvent);
      } catch {
        // ignora chunk malformado
      }
    }
  }
}
