import { ok, type Result } from "@/src/lib/result";
import { toActivityDTO } from "@/src/mappers/activity.mapper";
import { ActivityRepository } from "@/src/repositories/activity.repository";
import type {
  ActivityDTO,
  AuditQueryInput,
  TimelineEntity,
} from "@/src/schemas/activity.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Recurso de permissão e campo de vínculo por entidade da timeline. */
const TIMELINE_META: Record<
  TimelineEntity,
  { resource: string; field: "companyId" | "personId" | "opportunityId" }
> = {
  company: { resource: "companies", field: "companyId" },
  person: { resource: "people", field: "personId" },
  opportunity: { resource: "opportunities", field: "opportunityId" },
};

export const ActivityService = {
  /** Timeline de um registro — exige VIEW no recurso da entidade-alvo. */
  async timelineFor(
    userId: string,
    slug: string,
    entity: TimelineEntity,
    recordId: string,
  ): Promise<Result<ActivityDTO[]>> {
    const meta = TIMELINE_META[entity];
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: meta.resource,
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const result = await ActivityRepository.listByRecord(
      ws.value,
      meta.field,
      recordId,
    );
    if (!result.ok) return result;
    return ok(result.value.map(toActivityDTO));
  },

  /** Audit log da workspace — exige `audit-logs:VIEW`. */
  async auditList(
    userId: string,
    slug: string,
    query: AuditQueryInput,
  ): Promise<Result<ActivityDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "audit-logs",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const result = await ActivityRepository.listByWorkspace(ws.value, {
      entity: query.entity,
      actorUserId: query.actorUserId,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
    });
    if (!result.ok) return result;
    return ok(result.value.map(toActivityDTO));
  },
};
