import type { Activity } from "@prisma/client";
import type { ActivityDTO } from "@/src/schemas/activity.schema";

/** `Prisma.Activity` → `ActivityDTO` (data em ISO; `data` Json fica fora do DTO). */
export function toActivityDTO(activity: Activity): ActivityDTO {
  return {
    id: activity.id,
    action: activity.action,
    entity: activity.entity,
    entityId: activity.entityId,
    companyId: activity.companyId,
    personId: activity.personId,
    opportunityId: activity.opportunityId,
    changedFields: activity.changedFields,
    summary: activity.summary,
    actorUserId: activity.actorUserId,
    workspaceId: activity.workspaceId,
    createdAt: activity.createdAt.toISOString(),
  };
}
