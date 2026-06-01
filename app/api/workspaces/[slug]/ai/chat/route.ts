import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { SendAiMessageSchema } from "@/src/schemas/ai-assistant.schema";
import { AiAssistantService } from "@/src/services/ai-assistant.service";
import { handleError } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Chat com o agente do workspace. Responde via SSE (`text/event-stream`):
 * cada linha `data: <json>` carrega um chunk { type: "start" | "text" |
 * "done" | "error" }. Auth/validação/configuração são checadas antes de
 * iniciar o stream (viram JSON de erro normal).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = SendAiMessageSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug } = await params;
  const result = await AiAssistantService.streamReply({
    userId: session.value.user.id,
    userName: session.value.user.name ?? "você",
    slug,
    input: parsed.data,
  });
  if (!result.ok) return handleError(result.error);

  const { conversationId, run } = result.value;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ type: "start", conversationId });
      try {
        for await (const chunk of run) {
          send(chunk);
        }
      } catch (error) {
        console.error("[ai] erro no stream do agente", error);
        send({ type: "error", message: "Falha ao gerar resposta" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
