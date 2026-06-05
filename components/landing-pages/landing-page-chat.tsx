"use client";

import {
  Attachment01Icon,
  Cancel01Icon,
  File01Icon,
  Image01Icon,
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
import { ACCEPTED_ATTACHMENT_ACCEPT } from "@/src/lib/ai/attachment-constants";
import {
  AI_PROVIDER_META,
  type AiProviderId,
} from "@/src/lib/ai/provider-meta";
import type { AiAttachmentDTO } from "@/src/schemas/ai-attachment.schema";
import type { LandingPageMessageDTO } from "@/src/schemas/landing-page.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: AiAttachmentDTO[];
};

/** Eventos SSE emitidos pela rota de geração. */
type GenEvent =
  | { type: "user"; message: LandingPageMessageDTO }
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
  providers = ["openai"],
}: {
  slug: string;
  pageId: string;
  /** Indica se a página já tem HTML (muda o texto do estado vazio). */
  hasContent: boolean;
  onHtml: (html: string) => void;
  /** Provedores de IA disponíveis (configurados no servidor). */
  providers?: AiProviderId[];
}) {
  const [messages, setMessages] = React.useState<UiMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [provider, setProvider] = React.useState<AiProviderId>(
    providers[0] ?? "openai",
  );
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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
              attachments: m.attachments,
            })),
          );
        }
      })
      .catch(() => {});
  }, [baseUrl]);

  const addFiles = React.useCallback((picked: FileList | File[] | null) => {
    if (!picked) return;
    const list = Array.from(picked);
    if (list.length === 0) return;
    setFiles((prev) => [...prev, ...list].slice(0, 5));
  }, []);

  const removeFile = React.useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao mudar msgs
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = React.useCallback(
    async (text: string, attached: File[]) => {
      const content = text.trim();
      // Permite enviar só com anexos, desde que haja arquivos.
      if ((!content && attached.length === 0) || isStreaming) return;

      setError(null);
      setInput("");
      setFiles([]);
      setIsStreaming(true);

      const userId = tempId();
      const assistantId = tempId();
      // Prévia local dos anexos enquanto o servidor não devolve os IDs reais.
      const localAttachments: AiAttachmentDTO[] = attached.map((f, i) => ({
        id: `local-${i}`,
        kind: f.type.startsWith("image/") ? "IMAGE" : "DOCUMENT",
        filename: f.name,
        contentType: f.type,
        size: f.size,
      }));
      setMessages((prev) => [
        ...prev,
        {
          id: userId,
          role: "user",
          content,
          attachments:
            localAttachments.length > 0 ? localAttachments : undefined,
        },
        { id: assistantId, role: "assistant", content: "" },
      ]);

      const setAssistant = (updater: (cur: string) => string) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: updater(m.content) } : m,
          ),
        );

      try {
        // Com anexos enviamos multipart; sem anexos mantemos JSON.
        let body: BodyInit;
        const init: RequestInit = { method: "POST" };
        if (attached.length > 0) {
          const form = new FormData();
          form.set("message", content);
          form.set("provider", provider);
          for (const f of attached) form.append("files", f);
          body = form;
        } else {
          init.headers = { "Content-Type": "application/json" };
          body = JSON.stringify({ message: content, provider });
        }
        init.body = body;

        const res = await fetch(baseUrl, init);

        if (!res.ok || !res.body) {
          const json = (await res
            .json()
            .catch(() => null)) as ApiResponse<unknown> | null;
          throw new Error(json?.message ?? "Não foi possível gerar a página.");
        }

        let sawText = false;
        await consumeStream(res.body, (event) => {
          if (event.type === "user") {
            // Substitui a prévia local pela mensagem persistida (IDs reais).
            setMessages((prev) =>
              prev.map((m) =>
                m.id === userId
                  ? {
                      id: event.message.id,
                      role: "user",
                      content: event.message.content,
                      attachments: event.message.attachments,
                    }
                  : m,
              ),
            );
          } else if (event.type === "text") {
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
    [baseUrl, isStreaming, onHtml, provider],
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
                  onClick={() => send(s, [])}
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
                  "flex max-w-[85%] flex-col gap-1.5",
                  m.role === "user" ? "items-end" : "items-start",
                )}
              >
                {m.attachments && m.attachments.length > 0 ? (
                  <div
                    className={cn(
                      "flex flex-wrap gap-1.5",
                      m.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {m.attachments.map((a) => (
                      <AttachmentBubble
                        key={a.id}
                        attachment={a}
                        baseUrl={baseUrl}
                      />
                    ))}
                  </div>
                ) : null}
                {m.content || m.role === "assistant" ? (
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
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
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? (
        <p className="px-3 pb-1 text-destructive text-xs">{error}</p>
      ) : null}

      <form
        className="shrink-0 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input, files);
        }}
      >
        {files.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="flex items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs"
              >
                <HugeiconsIcon
                  icon={f.type.startsWith("image/") ? Image01Icon : File01Icon}
                  strokeWidth={2}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="max-w-[140px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remover ${f.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {providers.length > 1 ? (
          <fieldset
            aria-label="Modelo de IA"
            className="mb-2 inline-flex rounded-md border bg-muted/50 p-0.5"
          >
            {providers.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={provider === p}
                disabled={isStreaming}
                onClick={() => setProvider(p)}
                className={cn(
                  "rounded px-2 py-0.5 font-medium text-xs transition-colors disabled:opacity-50",
                  provider === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {AI_PROVIDER_META[p].short}
              </button>
            ))}
          </fieldset>
        ) : null}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={isStreaming || files.length >= 5}
            aria-label="Anexar arquivo"
            onClick={() => fileInputRef.current?.click()}
          >
            <HugeiconsIcon icon={Attachment01Icon} strokeWidth={2} />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => {
              const pasted = Array.from(e.clipboardData.files);
              if (pasted.length > 0) {
                e.preventDefault();
                addFiles(pasted);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input, files);
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
            disabled={isStreaming || (!input.trim() && files.length === 0)}
            aria-label="Enviar"
          >
            <HugeiconsIcon
              icon={isStreaming ? Loading03Icon : Sent02Icon}
              strokeWidth={2}
              className={cn(isStreaming && "animate-spin")}
            />
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Renderiza um anexo numa mensagem: miniatura p/ imagem, chip p/ documento. */
function AttachmentBubble({
  attachment,
  baseUrl,
}: {
  attachment: AiAttachmentDTO;
  baseUrl: string;
}) {
  const isLocal = attachment.id.startsWith("local-");
  const href = isLocal ? null : `${baseUrl}/attachments/${attachment.id}`;

  if (attachment.kind === "IMAGE") {
    if (!href) {
      return (
        <span className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-muted-foreground text-xs">
          <HugeiconsIcon
            icon={Image01Icon}
            strokeWidth={2}
            className="size-4"
          />
          <span className="max-w-[160px] truncate">{attachment.filename}</span>
        </span>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block">
        {/* biome-ignore lint/performance/noImgElement: anexo dinâmico do storage */}
        <img
          src={href}
          alt={attachment.filename}
          className="max-h-32 rounded-md border object-cover"
        />
      </a>
    );
  }

  const chip = (
    <span className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-foreground text-xs">
      <HugeiconsIcon
        icon={File01Icon}
        strokeWidth={2}
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span className="max-w-[160px] truncate">{attachment.filename}</span>
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {chip}
    </a>
  ) : (
    chip
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
