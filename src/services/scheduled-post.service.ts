import type { Prisma } from "@prisma/client";
import {
  scheduledPostInvalid,
  scheduledPostNotFound,
  storageNotConfigured,
} from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";
import { getObjectBytes, isStorageConfigured } from "@/src/lib/storage/s3";
import {
  type ScheduledPostWithRelations,
  toScheduledPostDTO,
} from "@/src/mappers/scheduled-post.mapper";
import {
  type MediaSeed,
  ScheduledPostRepository,
} from "@/src/repositories/scheduled-post.repository";
import type { InstagramPostType } from "@/src/schemas/instagram.schema";
import {
  type CreateScheduledPostInput,
  INSTAGRAM_POST_TYPE_MEDIA,
  PLATFORM_MEDIA_REQUIREMENT,
  PLATFORM_TEXT_LIMIT,
  type PublishablePlatform,
  type ScheduledPostDTO,
  ScheduledPostOptionsSchema,
} from "@/src/schemas/scheduled-post.schema";
import { FacebookService } from "@/src/services/facebook.service";
import { InstagramService } from "@/src/services/instagram.service";
import { LinkedInService } from "@/src/services/linkedin.service";
import { TiktokService } from "@/src/services/tiktok.service";
import { TwitterService } from "@/src/services/twitter.service";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";
import { YoutubeService } from "@/src/services/youtube.service";

/** Mídia recebida na criação (já lida como bytes, antes de ir ao MinIO). */
export type UploadMedia = {
  kind: "IMAGE" | "VIDEO";
  bytes: ArrayBuffer;
  contentType: string;
};

/**
 * Valida que cada plataforma escolhida tem o que precisa (mídia + texto). Roda
 * antes de persistir: erra cedo com mensagem clara em vez de falhar no publish.
 */
function validateRequirements(
  platforms: PublishablePlatform[],
  content: string,
  title: string | null,
  media: { kind: "IMAGE" | "VIDEO" }[],
  igPostType: InstagramPostType,
): Result<true> {
  const hasImage = media.some((m) => m.kind === "IMAGE");
  const hasVideo = media.some((m) => m.kind === "VIDEO");

  for (const platform of platforms) {
    // Instagram: o requisito de mídia varia conforme o modelo de post.
    if (platform === "INSTAGRAM") {
      const igReq = INSTAGRAM_POST_TYPE_MEDIA[igPostType];
      if (igReq === "image" && !hasImage) {
        return err(
          scheduledPostInvalid("Publicação no Instagram exige uma imagem.", {
            platform,
          }),
        );
      }
      if (igReq === "video" && !hasVideo) {
        return err(
          scheduledPostInvalid("Reels do Instagram exige um vídeo.", {
            platform,
          }),
        );
      }
      if (igReq === "either" && !hasImage && !hasVideo) {
        return err(
          scheduledPostInvalid(
            "Stories do Instagram exige uma imagem ou vídeo.",
            { platform },
          ),
        );
      }
      if (content.length > PLATFORM_TEXT_LIMIT.INSTAGRAM) {
        return err(
          scheduledPostInvalid(
            `O texto excede o limite de ${PLATFORM_TEXT_LIMIT.INSTAGRAM} caracteres do INSTAGRAM.`,
            { platform },
          ),
        );
      }
      continue;
    }

    const requirement = PLATFORM_MEDIA_REQUIREMENT[platform];
    if (requirement === "image" && !hasImage) {
      return err(
        scheduledPostInvalid(`${platform} exige ao menos uma imagem.`, {
          platform,
        }),
      );
    }
    if (requirement === "video" && !hasVideo) {
      return err(
        scheduledPostInvalid(`${platform} exige um vídeo.`, { platform }),
      );
    }
    if (content.length > PLATFORM_TEXT_LIMIT[platform]) {
      return err(
        scheduledPostInvalid(
          `O texto excede o limite de ${PLATFORM_TEXT_LIMIT[platform]} caracteres do ${platform}.`,
          { platform },
        ),
      );
    }

    // Texto obrigatório onde não há mídia que carregue o post sozinho.
    const needsText = platform === "TWITTER" || platform === "LINKEDIN";
    if (needsText && content.trim().length === 0) {
      return err(
        scheduledPostInvalid(`${platform} exige um texto.`, { platform }),
      );
    }
    if (platform === "FACEBOOK" && content.trim().length === 0 && !hasImage) {
      return err(
        scheduledPostInvalid("Facebook exige um texto ou uma imagem.", {
          platform,
        }),
      );
    }
    if (platform === "YOUTUBE" && !title && content.trim().length === 0) {
      return err(
        scheduledPostInvalid(
          "YouTube exige um título (ou ao menos um texto para usar como título).",
          { platform },
        ),
      );
    }
  }
  return ok(true);
}

/** Publica UM alvo já carregado, escolhendo o service da plataforma. */
async function publishTarget(
  platform: PublishablePlatform,
  ctx: {
    userId: string;
    slug: string;
    content: string;
    title: string | null;
    options: Prisma.JsonValue | null;
    image: { bytes: ArrayBuffer; contentType: string } | null;
    video: { bytes: ArrayBuffer; contentType: string } | null;
  },
): Promise<Result<{ externalId: string }>> {
  const parsedOptions = ScheduledPostOptionsSchema.safeParse(ctx.options ?? {});
  const options = parsedOptions.success ? parsedOptions.data : undefined;

  switch (platform) {
    case "INSTAGRAM": {
      const postType = options?.instagram?.postType ?? "FEED";
      // Escolhe a mídia conforme o modelo: reels → vídeo; feed → imagem;
      // stories → imagem se houver, senão vídeo.
      let media: {
        bytes: ArrayBuffer;
        contentType: string;
        kind: "IMAGE" | "VIDEO";
      } | null = null;
      if (postType === "REELS") {
        media = ctx.video ? { ...ctx.video, kind: "VIDEO" } : null;
      } else if (postType === "STORIES") {
        media = ctx.image
          ? { ...ctx.image, kind: "IMAGE" }
          : ctx.video
            ? { ...ctx.video, kind: "VIDEO" }
            : null;
      } else {
        media = ctx.image ? { ...ctx.image, kind: "IMAGE" } : null;
      }
      if (!media) {
        return err(
          scheduledPostInvalid(
            "Mídia ausente para o modelo de post do Instagram.",
          ),
        );
      }
      const r = await InstagramService.publishPost(
        ctx.userId,
        ctx.slug,
        { caption: ctx.content, postType },
        media,
      );
      return r.ok ? ok({ externalId: r.value.postId }) : r;
    }
    case "FACEBOOK": {
      const r = await FacebookService.publishPost(
        ctx.userId,
        ctx.slug,
        { message: ctx.content, link: options?.facebook?.link ?? null },
        ctx.image,
      );
      return r.ok ? ok({ externalId: r.value.postId }) : r;
    }
    case "TWITTER": {
      const r = await TwitterService.publishTweet(
        ctx.userId,
        ctx.slug,
        { text: ctx.content },
        ctx.image,
      );
      return r.ok ? ok({ externalId: r.value.tweetId }) : r;
    }
    case "LINKEDIN": {
      const r = await LinkedInService.publish(ctx.userId, ctx.slug, {
        text: ctx.content,
      });
      return r.ok ? ok({ externalId: r.value.postUrn }) : r;
    }
    case "TIKTOK": {
      if (!ctx.video) return err(scheduledPostInvalid("Vídeo ausente."));
      const r = await TiktokService.publishVideo(
        ctx.userId,
        ctx.slug,
        {
          title: ctx.title ?? ctx.content,
          privacyLevel: options?.tiktok?.privacy ?? "SELF_ONLY",
          disableComment: options?.tiktok?.disableComment ?? false,
          disableDuet: options?.tiktok?.disableDuet ?? false,
          disableStitch: options?.tiktok?.disableStitch ?? false,
        },
        ctx.video,
      );
      return r.ok ? ok({ externalId: r.value.publishId }) : r;
    }
    case "YOUTUBE": {
      if (!ctx.video) return err(scheduledPostInvalid("Vídeo ausente."));
      const r = await YoutubeService.publishVideo(
        ctx.userId,
        ctx.slug,
        {
          title: ctx.title ?? (ctx.content.slice(0, 100) || "Sem título"),
          description: ctx.content,
          privacyStatus: options?.youtube?.privacy ?? "public",
          tags: options?.youtube?.tags ?? [],
        },
        ctx.video,
      );
      return r.ok ? ok({ externalId: r.value.videoId }) : r;
    }
  }
}

/**
 * Publica todos os alvos PENDENTES de um post: baixa a mídia do MinIO uma vez,
 * chama o service de cada plataforma e consolida o status do post. Reaproveitado
 * pelo publish "agora" e pelo cron tick. Não lança — falhas viram status.
 */
export async function publishScheduledPost(
  post: ScheduledPostWithRelations,
): Promise<void> {
  const ws = await prisma.workspace.findUnique({
    where: { id: post.workspaceId },
    select: { slug: true },
  });
  if (!ws) {
    await ScheduledPostRepository.updateStatus(post.id, "FAILED", {
      lastError: "Workspace não encontrada",
    });
    return;
  }

  // Baixa cada mídia uma única vez (cache por storageKey).
  const cache = new Map<string, { bytes: ArrayBuffer; contentType: string }>();
  const firstImage = post.media.find((m) => m.kind === "IMAGE") ?? null;
  const firstVideo = post.media.find((m) => m.kind === "VIDEO") ?? null;

  async function load(
    key: string | null,
    contentType: string | null,
  ): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
    if (!key) return null;
    const cached = cache.get(key);
    if (cached) return cached;
    const loaded = await getObjectBytes(key);
    const value = {
      bytes: loaded.bytes,
      contentType: contentType ?? loaded.contentType,
    };
    cache.set(key, value);
    return value;
  }

  let image: { bytes: ArrayBuffer; contentType: string } | null = null;
  let video: { bytes: ArrayBuffer; contentType: string } | null = null;
  try {
    image = await load(
      firstImage?.storageKey ?? null,
      firstImage?.contentType ?? null,
    );
    video = await load(
      firstVideo?.storageKey ?? null,
      firstVideo?.contentType ?? null,
    );
  } catch {
    await ScheduledPostRepository.updateStatus(post.id, "FAILED", {
      lastError: "Falha ao carregar a mídia do armazenamento",
    });
    return;
  }

  let published = 0;
  let failed = 0;
  let firstError: string | null = null;

  for (const target of post.targets) {
    if (target.status === "PUBLISHED" || target.status === "CANCELED") {
      if (target.status === "PUBLISHED") published++;
      continue;
    }
    await ScheduledPostRepository.updateTarget(target.id, {
      status: "PUBLISHING",
      attempts: target.attempts + 1,
    });

    const result = await publishTarget(target.platform as PublishablePlatform, {
      userId: post.createdById,
      slug: ws.slug,
      content: post.content,
      title: post.title,
      options: post.options,
      image,
      video,
    });

    if (result.ok) {
      published++;
      await ScheduledPostRepository.updateTarget(target.id, {
        status: "PUBLISHED",
        externalPostId: result.value.externalId,
        error: null,
        publishedAt: new Date(),
      });
    } else {
      failed++;
      firstError = firstError ?? result.error.message;
      await ScheduledPostRepository.updateTarget(target.id, {
        status: "FAILED",
        error: result.error.message,
      });
    }
  }

  const finalStatus =
    failed === 0
      ? "PUBLISHED"
      : published === 0
        ? "FAILED"
        : "PARTIALLY_FAILED";

  await ScheduledPostRepository.updateStatus(post.id, finalStatus, {
    publishedAt: finalStatus === "FAILED" ? null : new Date(),
    lastError: firstError,
  });
}

export const ScheduledPostService = {
  /**
   * Cria o post: valida requisitos, sobe a mídia ao MinIO e persiste. Em modo
   * "now" publica imediatamente (inline) e retorna o resultado; em "schedule"
   * fica SCHEDULED para o cron processar.
   */
  async create(
    userId: string,
    slug: string,
    input: CreateScheduledPostInput,
    media: UploadMedia[],
  ): Promise<Result<ScheduledPostDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    if (!isStorageConfigured()) return err(storageNotConfigured());

    const title = input.title?.trim() ? input.title.trim() : null;

    const valid = validateRequirements(
      input.platforms,
      input.content,
      title,
      media,
      input.options.instagram?.postType ?? "FEED",
    );
    if (!valid.ok) return valid;

    // Sobe cada mídia ao MinIO sob uma chave isolada por workspace.
    const { putObject } = await import("@/src/lib/storage/s3");
    const { randomBytes } = await import("node:crypto");
    const seeds: MediaSeed[] = [];
    for (let i = 0; i < media.length; i++) {
      const m = media[i];
      const ext = m.contentType.split("/")[1] ?? "bin";
      const key = `${ws.value}/scheduled/${randomBytes(16).toString("hex")}.${ext}`;
      try {
        await putObject(key, m.bytes, m.contentType);
      } catch {
        return err(storageNotConfigured("Falha ao enviar a mídia ao MinIO."));
      }
      seeds.push({
        kind: m.kind,
        storageKey: key,
        contentType: m.contentType,
        sizeBytes: m.bytes.byteLength,
        order: i,
      });
    }

    const isNow = input.mode === "now";
    const scheduledFor = isNow
      ? new Date()
      : new Date(input.scheduledFor as string);

    const created = await ScheduledPostRepository.create(
      {
        workspaceId: ws.value,
        createdById: userId,
        content: input.content,
        title,
        options: input.options as unknown as Prisma.InputJsonValue,
        status: isNow ? "PUBLISHING" : "SCHEDULED",
        scheduledFor,
      },
      input.platforms.map((platform) => ({ platform })),
      seeds,
    );
    if (!created.ok) return created;

    if (isNow) {
      await publishScheduledPost(created.value);
      const reloaded = await ScheduledPostRepository.findById(created.value.id);
      if (!reloaded.ok) return reloaded;
      if (!reloaded.value) return err(scheduledPostNotFound());
      return ok(toScheduledPostDTO(reloaded.value));
    }

    return ok(toScheduledPostDTO(created.value));
  },

  async list(
    userId: string,
    slug: string,
  ): Promise<Result<ScheduledPostDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const result = await ScheduledPostRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toScheduledPostDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ScheduledPostDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const result = await ScheduledPostRepository.findById(id);
    if (!result.ok) return result;
    if (!result.value || result.value.workspaceId !== ws.value) {
      return err(scheduledPostNotFound());
    }
    return ok(toScheduledPostDTO(result.value));
  },

  async cancel(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ScheduledPostDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    const found = await ScheduledPostRepository.findById(id);
    if (!found.ok) return found;
    if (!found.value || found.value.workspaceId !== ws.value) {
      return err(scheduledPostNotFound());
    }
    if (found.value.status !== "SCHEDULED" && found.value.status !== "FAILED") {
      return err(
        scheduledPostInvalid(
          "Só é possível cancelar posts agendados ou que falharam.",
        ),
      );
    }
    const canceled = await ScheduledPostRepository.cancel(id);
    if (!canceled.ok) return canceled;
    const reloaded = await ScheduledPostRepository.findById(id);
    if (!reloaded.ok) return reloaded;
    if (!reloaded.value) return err(scheduledPostNotFound());
    return ok(toScheduledPostDTO(reloaded.value));
  },

  async reschedule(
    userId: string,
    slug: string,
    id: string,
    scheduledFor: Date,
  ): Promise<Result<ScheduledPostDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    const found = await ScheduledPostRepository.findById(id);
    if (!found.ok) return found;
    if (!found.value || found.value.workspaceId !== ws.value) {
      return err(scheduledPostNotFound());
    }
    if (
      found.value.status === "PUBLISHED" ||
      found.value.status === "PUBLISHING"
    ) {
      return err(
        scheduledPostInvalid("Não é possível reagendar um post já publicado."),
      );
    }
    const updated = await ScheduledPostRepository.reschedule(id, scheduledFor);
    if (!updated.ok) return updated;
    const reloaded = await ScheduledPostRepository.findById(id);
    if (!reloaded.ok) return reloaded;
    if (!reloaded.value) return err(scheduledPostNotFound());
    return ok(toScheduledPostDTO(reloaded.value));
  },
};
