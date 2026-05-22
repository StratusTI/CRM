import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { PublishVideoSchema } from "@/src/schemas/youtube.schema";
import { YoutubeService } from "@/src/services/youtube.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

/** Limite de tamanho do upload (defensivo — o arquivo vai inteiro para memória). */
const MAX_VIDEO_BYTES = 256 * 1024 * 1024; // 256 MB

/** Publica (upload) de um vídeo no canal. Corpo: `multipart/form-data`. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, platform: platformSlug } = await params;
  if (parsePlatformSlug(platformSlug) !== "YOUTUBE") {
    return handleError(badRequest("Plataforma não suportada nesta rota"));
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return handleError(
      badRequest("Corpo inválido (esperado multipart/form-data)"),
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return handleError(badRequest("Arquivo de vídeo ausente"));
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return handleError(badRequest("Vídeo excede o tamanho máximo (256 MB)"));
  }

  // `tags` chega como string separada por vírgulas (campo de texto do form).
  const rawTags = form.get("tags");
  const tags =
    typeof rawTags === "string" && rawTags.trim()
      ? rawTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  const parsed = PublishVideoSchema.safeParse({
    title: form.get("title") ?? undefined,
    description: form.get("description") ?? undefined,
    privacyStatus: form.get("privacyStatus") ?? undefined,
    tags,
  });
  if (!parsed.success) {
    return handleError(
      validationError("Dados do vídeo inválidos", z.flattenError(parsed.error)),
    );
  }

  const result = await YoutubeService.publishVideo(
    session.value.user.id,
    slug,
    parsed.data,
    {
      bytes: await file.arrayBuffer(),
      contentType: file.type || "video/*",
    },
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value, 201);
}
