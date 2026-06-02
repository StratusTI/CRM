import type {
  ScheduledPost,
  ScheduledPostMedia,
  ScheduledPostTarget,
} from "@prisma/client";
import type {
  ScheduledPostDTO,
  ScheduledPostMediaDTO,
  ScheduledPostTargetDTO,
} from "@/src/schemas/scheduled-post.schema";

export function toScheduledPostTargetDTO(
  target: ScheduledPostTarget,
): ScheduledPostTargetDTO {
  return {
    id: target.id,
    platform: target.platform,
    status: target.status,
    externalPostId: target.externalPostId,
    error: target.error,
    attempts: target.attempts,
    publishedAt: target.publishedAt ? target.publishedAt.toISOString() : null,
  };
}

export function toScheduledPostMediaDTO(
  media: ScheduledPostMedia,
): ScheduledPostMediaDTO {
  return {
    id: media.id,
    kind: media.kind,
    contentType: media.contentType,
    sizeBytes: media.sizeBytes,
    order: media.order,
  };
}

export type ScheduledPostWithRelations = ScheduledPost & {
  targets: ScheduledPostTarget[];
  media: ScheduledPostMedia[];
};

export function toScheduledPostDTO(
  post: ScheduledPostWithRelations,
): ScheduledPostDTO {
  return {
    id: post.id,
    content: post.content,
    title: post.title,
    status: post.status,
    scheduledFor: post.scheduledFor.toISOString(),
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    lastError: post.lastError,
    workspaceId: post.workspaceId,
    createdById: post.createdById,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    targets: post.targets.map(toScheduledPostTargetDTO),
    media: post.media.map(toScheduledPostMediaDTO),
  };
}
