import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { TIKTOK_SINGLE_CHUNK_MAX_BYTES } from "@/src/lib/social/tiktok/client";
import { PublishPostSchema } from "@/src/schemas/facebook.schema";
import { PublishInstagramPostSchema } from "@/src/schemas/instagram.schema";
import { LinkedInPublishInputSchema } from "@/src/schemas/linkedin.schema";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { PublishTiktokVideoSchema } from "@/src/schemas/tiktok.schema";
import { PublishTweetSchema } from "@/src/schemas/twitter.schema";
import { PublishVideoSchema } from "@/src/schemas/youtube.schema";
import { FacebookService } from "@/src/services/facebook.service";
import { InstagramService } from "@/src/services/instagram.service";
import { LinkedInService } from "@/src/services/linkedin.service";
import { TiktokService } from "@/src/services/tiktok.service";
import { TwitterService } from "@/src/services/twitter.service";
import { YoutubeService } from "@/src/services/youtube.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

const MAX_VIDEO_BYTES = 256 * 1024 * 1024; // 256 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Publica conteúdo na conta. Corpo: `multipart/form-data` (varia por plataforma). */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, platform: platformSlug } = await params;
  const userId = session.value.user.id;
  const platform = parsePlatformSlug(platformSlug);

  /* --------------------------------- LinkedIn ------------------------------- */
  // LinkedIn envia JSON (não multipart), portanto é tratado antes do FormData.
  if (platform === "LINKEDIN") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return handleError(badRequest("Corpo JSON inválido"));
    }
    const parsed = LinkedInPublishInputSchema.safeParse(body);
    if (!parsed.success) {
      return handleError(
        validationError(
          "Dados da publicação inválidos",
          z.flattenError(parsed.error),
        ),
      );
    }
    const result = await LinkedInService.publish(userId, slug, parsed.data);
    if (!result.ok) return handleError(result.error);
    return successResponse(result.value, 201);
  }

  if (
    platform !== "YOUTUBE" &&
    platform !== "FACEBOOK" &&
    platform !== "INSTAGRAM" &&
    platform !== "TIKTOK" &&
    platform !== "TWITTER"
  ) {
    return handleError(badRequest("Plataforma não suportada"));
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return handleError(
      badRequest("Corpo inválido (esperado multipart/form-data)"),
    );
  }

  /* --------------------------------- YouTube -------------------------------- */
  if (platform === "YOUTUBE") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return handleError(badRequest("Arquivo de vídeo ausente"));
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return handleError(badRequest("Vídeo excede o tamanho máximo (256 MB)"));
    }

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
        validationError(
          "Dados do vídeo inválidos",
          z.flattenError(parsed.error),
        ),
      );
    }

    const result = await YoutubeService.publishVideo(
      userId,
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

  /* --------------------------------- TikTok --------------------------------- */
  if (platform === "TIKTOK") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return handleError(badRequest("Arquivo de vídeo ausente"));
    }
    if (file.size > TIKTOK_SINGLE_CHUNK_MAX_BYTES) {
      return handleError(badRequest("Vídeo excede o tamanho máximo (64 MB)"));
    }

    const asBool = (value: FormDataEntryValue | null): boolean =>
      value === "true" || value === "on" || value === "1";

    const parsedTiktok = PublishTiktokVideoSchema.safeParse({
      title: form.get("title") ?? undefined,
      privacyLevel: form.get("privacyLevel") ?? undefined,
      disableComment: asBool(form.get("disableComment")),
      disableDuet: asBool(form.get("disableDuet")),
      disableStitch: asBool(form.get("disableStitch")),
    });
    if (!parsedTiktok.success) {
      return handleError(
        validationError(
          "Dados da publicação inválidos",
          z.flattenError(parsedTiktok.error),
        ),
      );
    }

    const result = await TiktokService.publishVideo(
      userId,
      slug,
      parsedTiktok.data,
      {
        bytes: await file.arrayBuffer(),
        contentType: file.type || "video/mp4",
      },
    );
    if (!result.ok) return handleError(result.error);
    return successResponse(result.value, 201);
  }

  /* -------------------------------- Instagram ------------------------------- */
  if (platform === "INSTAGRAM") {
    const parsedIg = PublishInstagramPostSchema.safeParse({
      caption: form.get("caption") ?? undefined,
      postType: form.get("postType") ?? undefined,
    });
    if (!parsedIg.success) {
      return handleError(
        validationError(
          "Dados da publicação inválidos",
          z.flattenError(parsedIg.error),
        ),
      );
    }

    // Reels exige vídeo; feed exige imagem; stories aceita os dois. A mídia chega
    // no campo `image` (imagem) ou `video` (vídeo).
    const imageField = form.get("image");
    const videoField = form.get("video");
    let media: {
      bytes: ArrayBuffer;
      contentType: string;
      kind: "IMAGE" | "VIDEO";
    } | null = null;

    if (videoField instanceof File && videoField.size > 0) {
      if (videoField.size > MAX_VIDEO_BYTES) {
        return handleError(
          badRequest("Vídeo excede o tamanho máximo (256 MB)"),
        );
      }
      media = {
        bytes: await videoField.arrayBuffer(),
        contentType: videoField.type || "video/mp4",
        kind: "VIDEO",
      };
    } else if (imageField instanceof File && imageField.size > 0) {
      if (imageField.size > MAX_IMAGE_BYTES) {
        return handleError(
          badRequest("Imagem excede o tamanho máximo (10 MB)"),
        );
      }
      media = {
        bytes: await imageField.arrayBuffer(),
        contentType: imageField.type || "image/jpeg",
        kind: "IMAGE",
      };
    }

    if (!media) {
      return handleError(
        badRequest("Mídia obrigatória — o Instagram exige mídia para publicar"),
      );
    }
    if (parsedIg.data.postType === "REELS" && media.kind !== "VIDEO") {
      return handleError(badRequest("Reels exige um arquivo de vídeo"));
    }
    if (parsedIg.data.postType === "FEED" && media.kind !== "IMAGE") {
      return handleError(badRequest("Publicação no feed exige uma imagem"));
    }

    const result = await InstagramService.publishPost(
      userId,
      slug,
      parsedIg.data,
      media,
    );
    if (!result.ok) return handleError(result.error);
    return successResponse(result.value, 201);
  }

  /* --------------------------------- Twitter -------------------------------- */
  if (platform === "TWITTER") {
    const parsedTweet = PublishTweetSchema.safeParse({
      text: form.get("text") ?? undefined,
    });
    if (!parsedTweet.success) {
      return handleError(
        validationError(
          "Dados do tweet inválidos",
          z.flattenError(parsedTweet.error),
        ),
      );
    }

    const imageField = form.get("image");
    let image: { bytes: ArrayBuffer; contentType: string } | null = null;
    if (imageField instanceof File && imageField.size > 0) {
      if (imageField.size > MAX_IMAGE_BYTES) {
        return handleError(
          badRequest("Imagem excede o tamanho máximo (10 MB)"),
        );
      }
      image = {
        bytes: await imageField.arrayBuffer(),
        contentType: imageField.type || "image/jpeg",
      };
    }

    const result = await TwitterService.publishTweet(
      userId,
      slug,
      parsedTweet.data,
      image,
    );
    if (!result.ok) return handleError(result.error);
    return successResponse(result.value, 201);
  }

  /* -------------------------------- Facebook -------------------------------- */
  const parsed = PublishPostSchema.safeParse({
    message: form.get("message") ?? undefined,
    link: form.get("link") ? form.get("link") : null,
  });
  if (!parsed.success) {
    return handleError(
      validationError(
        "Dados da publicação inválidos",
        z.flattenError(parsed.error),
      ),
    );
  }

  const imageField = form.get("image");
  let image: { bytes: ArrayBuffer; contentType: string } | null = null;
  if (imageField instanceof File && imageField.size > 0) {
    if (imageField.size > MAX_IMAGE_BYTES) {
      return handleError(badRequest("Imagem excede o tamanho máximo (10 MB)"));
    }
    image = {
      bytes: await imageField.arrayBuffer(),
      contentType: imageField.type || "image/*",
    };
  }

  const result = await FacebookService.publishPost(
    userId,
    slug,
    parsed.data,
    image,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value, 201);
}
