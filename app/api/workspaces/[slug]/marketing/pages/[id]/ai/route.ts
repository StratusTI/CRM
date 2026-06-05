import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { parseMessageRequest } from "@/src/lib/ai/parse-message-request";
import { getAuthSession } from "@/src/lib/auth-session";
import { GenerateLandingPageSchema } from "@/src/schemas/landing-page.schema";
import { LandingPageService } from "@/src/services/landing-page.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

/** Histórico do chat de geração da página. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id } = await params;
  const result = await LandingPageService.listMessages(
    session.value.user.id,
    slug,
    id,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}

/**
 * Geração/edição da página via IA. Responde via SSE (`text/event-stream`):
 * cada linha `data: <json>` carrega um chunk { type: "text" | "done" |
 * "error" }. Auth/validação/configuração são checadas antes de iniciar o
 * stream (viram JSON de erro normal).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { message, files } = await parseMessageRequest(request);
  const parsed = GenerateLandingPageSchema.safeParse({ message });
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug, id } = await params;
  const result = await LandingPageService.generate({
    userId: session.value.user.id,
    slug,
    id,
    message: parsed.data.message,
    files,
  });
  if (!result.ok) return handleError(result.error);

  const { run } = result.value;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        for await (const chunk of run) {
          send(chunk);
        }
      } catch (error) {
        console.error("[landing-ai] erro no stream de geração", error);
        send({ type: "error", message: "Falha ao gerar a página" });
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
