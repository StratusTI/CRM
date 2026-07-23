import type { TrackedCompetitor } from "@prisma/client";
import type { CompetitorDTO } from "@/src/schemas/competitor.schema";

/** `Prisma.TrackedCompetitor` → `CompetitorDTO` (datas em ISO). */
export function toCompetitorDTO(competitor: TrackedCompetitor): CompetitorDTO {
  return {
    id: competitor.id,
    platform: competitor.platform,
    handle: competitor.handle,
    profileUrl: competitor.profileUrl,
    followersCount: competitor.followersCount,
    notes: competitor.notes,
    workspaceId: competitor.workspaceId,
    createdById: competitor.createdById,
    updatedById: competitor.updatedById,
    createdAt: competitor.createdAt.toISOString(),
    updatedAt: competitor.updatedAt.toISOString(),
    deletedAt:
      competitor.deletedAt === null ? null : competitor.deletedAt.toISOString(),
  };
}
