import { leadRuleNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toRoutingRuleDTO, toScoringRuleDTO } from "@/src/mappers/lead.mapper";
import {
  LeadRoutingRuleRepository,
  LeadScoringRuleRepository,
} from "@/src/repositories/lead-rule.repository";
import type {
  CreateRoutingRuleInput,
  CreateScoringRuleInput,
  RoutingRuleDTO,
  ScoringRuleDTO,
} from "@/src/schemas/lead.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

export const LeadRuleService = {
  async listScoring(
    userId: string,
    slug: string,
  ): Promise<Result<ScoringRuleDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const rules = await LeadScoringRuleRepository.listByWorkspace(ws.value);
    if (!rules.ok) return rules;
    return ok(rules.value.map(toScoringRuleDTO));
  },

  async createScoring(
    userId: string,
    slug: string,
    input: CreateScoringRuleInput,
  ): Promise<Result<ScoringRuleDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    const created = await LeadScoringRuleRepository.create(ws.value, {
      field: input.field,
      operator: input.operator,
      value: input.value ?? null,
      points: input.points,
      active: input.active,
    });
    if (!created.ok) return created;
    return ok(toScoringRuleDTO(created.value));
  },

  async removeScoring(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    const removed = await LeadScoringRuleRepository.delete(id, ws.value);
    if (!removed.ok) return removed;
    if (!removed.value) return err(leadRuleNotFound());
    return ok(true);
  },

  async listRouting(
    userId: string,
    slug: string,
  ): Promise<Result<RoutingRuleDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const rules = await LeadRoutingRuleRepository.listByWorkspace(ws.value);
    if (!rules.ok) return rules;
    return ok(rules.value.map(toRoutingRuleDTO));
  },

  async createRouting(
    userId: string,
    slug: string,
    input: CreateRoutingRuleInput,
  ): Promise<Result<RoutingRuleDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    const created = await LeadRoutingRuleRepository.create(ws.value, {
      field: input.field,
      operator: input.operator,
      value: input.value ?? null,
      ownerId: input.ownerId,
      active: input.active,
    });
    if (!created.ok) return created;
    return ok(toRoutingRuleDTO(created.value));
  },

  async removeRouting(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    const removed = await LeadRoutingRuleRepository.delete(id, ws.value);
    if (!removed.ok) return removed;
    if (!removed.value) return err(leadRuleNotFound());
    return ok(true);
  },
};
