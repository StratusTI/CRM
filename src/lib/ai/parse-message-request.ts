import type { NextRequest } from "next/server";

/**
 * Lê o corpo de um POST de chat com IA, aceitando dois formatos:
 *
 * - `application/json` `{ message, conversationId? }` — fluxo antigo, sem anexos.
 * - `multipart/form-data` com os campos `message`, `conversationId?` e zero+
 *   campos `files` — quando o usuário anexa imagens/documentos.
 *
 * Devolve sempre `{ message, conversationId, files }`; `message` pode vir vazio
 * (validado a jusante) e `files` só conterá entradas que sejam de fato `File`.
 * `conversationId` é `undefined` quando ausente.
 */
export async function parseMessageRequest(request: NextRequest): Promise<{
  message: string;
  conversationId: string | undefined;
  files: File[];
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return { message: "", conversationId: undefined, files: [] };
    const message = String(form.get("message") ?? "");
    const rawConv = form.get("conversationId");
    const conversationId =
      typeof rawConv === "string" && rawConv.length > 0 ? rawConv : undefined;
    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File);
    return { message, conversationId, files };
  }

  const body = (await request.json().catch(() => null)) as {
    message?: unknown;
    conversationId?: unknown;
  } | null;
  const message = typeof body?.message === "string" ? body.message : "";
  const conversationId =
    typeof body?.conversationId === "string" && body.conversationId.length > 0
      ? body.conversationId
      : undefined;
  return { message, conversationId, files: [] };
}
