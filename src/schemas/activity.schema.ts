import { z } from "zod";

/** Contrato da feature Activity (timeline + audit log). Somente leitura. */

export const ACTIVITY_ACTIONS = ["CREATED", "UPDATED", "DELETED"] as const;

/** Entidades que aparecem na timeline por registro (Company/Person/Opportunity). */
export const TIMELINE_ENTITIES = ["company", "person", "opportunity"] as const;

export const ActivityOutputSchema = z.object({
  id: z.string(),
  action: z.enum(ACTIVITY_ACTIONS),
  entity: z.string(),
  entityId: z.string(),
  companyId: z.string().nullable(),
  personId: z.string().nullable(),
  opportunityId: z.string().nullable(),
  changedFields: z.array(z.string()),
  summary: z.string().nullable(),
  actorUserId: z.string().nullable(),
  workspaceId: z.string(),
  createdAt: z.string(),
});

/** Filtros aceitos na listagem do audit log (todos opcionais). */
export const AuditQuerySchema = z.object({
  entity: z.string().trim().min(1).optional(),
  actorUserId: z.string().trim().min(1).optional(),
  action: z.enum(ACTIVITY_ACTIONS).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export type ActivityDTO = z.infer<typeof ActivityOutputSchema>;
export type AuditQueryInput = z.infer<typeof AuditQuerySchema>;
export type TimelineEntity = (typeof TIMELINE_ENTITIES)[number];
