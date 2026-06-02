import { getOpenAiBaseUrl, getOpenAiKey, getOpenAiModel } from "./env";

/** Mensagens no formato Chat Completions da OpenAI. */
export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCallPayload[];
    }
  | { role: "tool"; content: string; tool_call_id: string };

export type ToolCallPayload = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

/** Definição de uma tool (function-calling). */
export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/** tool_call acumulada ao longo do stream. */
export type AccumulatedToolCall = { id: string; name: string; args: string };

export type AiUsageData = { inputTokens: number; outputTokens: number };

export type AiStreamEvent =
  | { type: "text"; delta: string }
  | {
      type: "finish";
      finishReason: string | null;
      content: string;
      toolCalls: AccumulatedToolCall[];
      usage: AiUsageData | null;
    }
  | { type: "error"; message: string };

const TEMPERATURE = 0.3;
const MAX_TOKENS = 4096;

/**
 * Faz uma chamada streaming ao endpoint Chat Completions e emite eventos:
 * deltas de texto conforme chegam, e um evento `finish` com o conteúdo
 * completo + tool_calls acumuladas. Erros viram um único evento `error`.
 *
 * @param toolChoice "required" força pelo menos uma tool_call (round 0 do agente);
 *                   "auto" deixa o modelo decidir; "none" proíbe tool calls.
 */
export async function* streamChat(
  messages: ChatMessage[],
  tools: ToolDef[],
  toolChoice: "auto" | "required" | "none" = "auto",
): AsyncGenerator<AiStreamEvent, void, unknown> {
  let response: Response;
  try {
    response = await fetch(`${getOpenAiBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getOpenAiKey()}`,
      },
      body: JSON.stringify({
        model: getOpenAiModel(),
        messages,
        ...(tools.length > 0 && { tools, tool_choice: toolChoice }),
        stream: true,
        stream_options: { include_usage: true },
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      }),
    });
  } catch (error) {
    console.error("[ai] erro de rede ao chamar OpenAI", error);
    yield { type: "error", message: "Erro de rede ao falar com a OpenAI" };
    return;
  }

  if (!response.ok || !response.body) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    console.error("[ai] OpenAI respondeu erro", response.status, detail);
    yield { type: "error", message: `OpenAI retornou ${response.status}` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const toolAcc = new Map<number, AccumulatedToolCall>();
  let content = "";
  let finishReason: string | null = null;
  let usageData: AiUsageData | null = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;

      let chunk: OpenAiChunk;
      try {
        chunk = JSON.parse(data) as OpenAiChunk;
      } catch {
        continue;
      }

      if (chunk.usage) {
        usageData = {
          inputTokens: chunk.usage.prompt_tokens,
          outputTokens: chunk.usage.completion_tokens,
        };
      }

      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? {};

      if (typeof delta.content === "string" && delta.content.length > 0) {
        content += delta.content;
        yield { type: "text", delta: delta.content };
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          const cur = toolAcc.get(idx) ?? { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name += tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          toolAcc.set(idx, cur);
        }
      }

      if (choice.finish_reason) finishReason = choice.finish_reason;
    }
  }

  const toolCalls = [...toolAcc.values()].filter((t) => t.name.length > 0);
  yield { type: "finish", finishReason, content, toolCalls, usage: usageData };
}

type OpenAiChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
