"use client";

import { useCallback, useRef, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  AiConversationDTO,
  AiMessageDTO,
} from "@/src/schemas/ai-assistant.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

/** Eventos SSE emitidos pela rota de chat. */
type ChatEvent =
  | { type: "start"; conversationId: string }
  | { type: "thinking"; tools: string[] }
  | { type: "text"; delta: string }
  | { type: "done"; conversationId: string; message: AiMessageDTO }
  | { type: "error"; message: string };

let tempCounter = 0;
const tempId = () => `tmp-${Date.now()}-${tempCounter++}`;

export function useAiAssistant(slug: string) {
  const [conversations, setConversations] = useState<AiConversationDTO[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Ferramentas que estão sendo consultadas no momento (para o indicador de pesquisa). */
  const [thinkingTools, setThinkingTools] = useState<string[]>([]);
  const activeIdRef = useRef<string | null>(null);

  const setActive = useCallback((id: string | null) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/ai/conversations`),
      );
      const json = (await res.json()) as ApiResponse<AiConversationDTO[]>;
      if (res.ok && json.success && json.data) setConversations(json.data);
    } catch {
      // silencioso: a lista é secundária
    }
  }, [slug]);

  const startNew = useCallback(() => {
    setActive(null);
    setMessages([]);
    setError(null);
  }, [setActive]);

  const openConversation = useCallback(
    async (id: string) => {
      setActive(id);
      setError(null);
      setIsLoadingConversation(true);
      try {
        const res = await fetch(
          apiUrl(`/api/workspaces/${slug}/ai/conversations/${id}`),
        );
        const json = (await res.json()) as ApiResponse<AiConversationDTO>;
        if (res.ok && json.success && json.data?.messages) {
          setMessages(
            json.data.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            })),
          );
        } else {
          setError(json.message ?? "Não foi possível abrir a conversa.");
        }
      } catch {
        setError("Erro de rede ao abrir a conversa.");
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [slug, setActive],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(apiUrl(`/api/workspaces/${slug}/ai/conversations/${id}`), {
          method: "DELETE",
        });
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeIdRef.current === id) startNew();
      } catch {
        setError("Erro de rede ao excluir a conversa.");
      }
    },
    [slug, startNew],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isStreaming) return;

      setError(null);
      setIsStreaming(true);

      const userMsg: UiMessage = { id: tempId(), role: "user", content };
      const assistantId = tempId();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      const appendDelta = (delta: string) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + delta } : m,
          ),
        );

      try {
        const res = await fetch(apiUrl(`/api/workspaces/${slug}/ai/chat`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeIdRef.current ?? undefined,
            message: content,
          }),
        });

        if (!res.ok || !res.body) {
          const json = (await res
            .json()
            .catch(() => null)) as ApiResponse<unknown> | null;
          throw new Error(
            json?.message ?? "Não foi possível falar com o assistente.",
          );
        }

        await consumeStream(res.body, (event) => {
          if (event.type === "start") {
            if (!activeIdRef.current) setActive(event.conversationId);
          } else if (event.type === "thinking") {
            setThinkingTools(event.tools);
          } else if (event.type === "text") {
            setThinkingTools([]); // limpa o indicador assim que o texto começa
            appendDelta(event.delta);
          } else if (event.type === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      id: event.message.id || m.id,
                      role: "assistant",
                      content: event.message.content,
                    }
                  : m,
              ),
            );
          } else if (event.type === "error") {
            setError(event.message);
          }
        });

        await refreshList();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erro inesperado.";
        setError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.content === ""
              ? { ...m, content: `⚠️ ${message}` }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        setThinkingTools([]);
      }
    },
    [slug, isStreaming, refreshList, setActive],
  );

  return {
    conversations,
    activeId,
    messages,
    isStreaming,
    isLoadingConversation,
    error,
    thinkingTools,
    refreshList,
    startNew,
    openConversation,
    deleteConversation,
    sendMessage,
  };
}

/** Lê o corpo SSE e chama `onEvent` para cada `data: {...}`. */
async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ChatEvent) => void,
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
        onEvent(JSON.parse(data) as ChatEvent);
      } catch {
        // ignora chunk malformado
      }
    }
  }
}
