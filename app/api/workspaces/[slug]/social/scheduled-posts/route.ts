import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { CreateScheduledPostInputSchema } from "@/src/schemas/scheduled-post.schema";
import {
  ScheduledPostService,
  type UploadMedia,
} from "@/src/services/scheduled-post.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ slug: string }> };

const MAX_VIDEO_BYTES = 256 * 1024 * 1024; // 256 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Lista os posts agendados/publicados do workspace. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const result = await ScheduledPostService.list(session.value.user.id, slug);
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}

/**
 * Cria um post agendado (ou publica "agora"). Corpo: `multipart/form-data` com
 * os campos de texto + arquivos sob o campo `media` (imagens e/ou vídeo).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return handleError(
      badRequest("Corpo inválido (esperado multipart/form-data)"),
    );
  }

  // Campos de texto: platforms e options chegam como JSON serializado.
  const parseJson = (raw: FormDataEntryValue | null): unknown => {
    if (typeof raw !== "string" || raw.trim() === "") return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  };

  const parsed = CreateScheduledPostInputSchema.safeParse({
    platforms: parseJson(form.get("platforms")) ?? [],
    content: form.get("content") ?? undefined,
    title: form.get("title") ?? undefined,
    mode: form.get("mode") ?? undefined,
    scheduledFor: form.get("scheduledFor") ?? undefined,
    options: parseJson(form.get("options")) ?? {},
  });
  if (!parsed.success) {
    return handleError(
      validationError(
        "Dados do agendamento inválidos",
        z.flattenError(parsed.error),
      ),
    );
  }

  // Arquivos de mídia: detecta tipo pelo content-type e valida tamanho.
  const media: UploadMedia[] = [];
  for (const entry of form.getAll("media")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    const isVideo = entry.type.startsWith("video/");
    const isImage = entry.type.startsWith("image/");
    if (!isVideo && !isImage) {
      return handleError(
        badRequest(
          `Tipo de mídia não suportado: ${entry.type || "desconhecido"}`,
        ),
      );
    }
    if (isVideo && entry.size > MAX_VIDEO_BYTES) {
      return handleError(badRequest("Vídeo excede o tamanho máximo (256 MB)"));
    }
    if (isImage && entry.size > MAX_IMAGE_BYTES) {
      return handleError(badRequest("Imagem excede o tamanho máximo (10 MB)"));
    }
    media.push({
      kind: isVideo ? "VIDEO" : "IMAGE",
      bytes: await entry.arrayBuffer(),
      contentType: entry.type,
    });
  }

  const result = await ScheduledPostService.create(
    session.value.user.id,
    slug,
    parsed.data,
    media,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value, 201);
}
