import type { NextRequest } from "next/server";

/**
 * Lê o corpo de um POST de chat com IA, aceitando dois formatos:
 *
 * - `application/json` `{ message }` — fluxo antigo, sem anexos.
 * - `multipart/form-data` com o campo `message` e zero+ campos `files` — quando
 *   o usuário anexa imagens/documentos.
 *
 * Devolve sempre `{ message, files }`; `message` pode vir vazio (validado a
 * jusante pelo schema) e `files` só conterá entradas que sejam de fato `File`.
 */
export async function parseMessageRequest(
  request: NextRequest,
): Promise<{ message: string; files: File[] }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return { message: "", files: [] };
    const message = String(form.get("message") ?? "");
    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File);
    return { message, files };
  }

  const body = (await request.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  const message = typeof body?.message === "string" ? body.message : "";
  return { message, files: [] };
}
