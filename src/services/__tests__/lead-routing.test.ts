import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const routingRepo = vi.hoisted(() => ({ listActive: vi.fn() }));
const leadRepo = vi.hoisted(() => ({ countActiveByOwner: vi.fn() }));
const memberRepo = vi.hoisted(() => ({ listByWorkspaceId: vi.fn() }));

vi.mock("@/src/repositories/lead-rule.repository", () => ({
  LeadRoutingRuleRepository: routingRepo,
  LeadScoringRuleRepository: {},
}));
vi.mock("@/src/repositories/lead.repository", () => ({
  LeadRepository: leadRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { resolveLeadOwner } from "@/src/services/lead-routing";

const lead = {
  name: "Maria",
  emails: [],
  phones: [],
  company: null,
  jobTitle: null,
  source: "WhatsApp",
  city: null,
};

beforeEach(() => {
  routingRepo.listActive.mockReset();
  leadRepo.countActiveByOwner.mockReset();
  memberRepo.listByWorkspaceId.mockReset();
});

describe("resolveLeadOwner", () => {
  it("usa a primeira regra que casa", async () => {
    routingRepo.listActive.mockResolvedValue(
      ok([
        { field: "source", operator: "equals", value: "site", ownerId: "u_x" },
        {
          field: "source",
          operator: "equals",
          value: "WhatsApp",
          ownerId: "u_w",
        },
      ]),
    );
    const result = await resolveLeadOwner("ws_1", lead);
    expect(result.ok && result.value).toBe("u_w");
  });

  it("sem regra → round-robin escolhe o de menos leads ativos", async () => {
    routingRepo.listActive.mockResolvedValue(ok([]));
    memberRepo.listByWorkspaceId.mockResolvedValue(
      ok([{ user: { id: "u_1" } }, { user: { id: "u_2" } }]),
    );
    leadRepo.countActiveByOwner.mockResolvedValue(ok(new Map([["u_1", 5]]))); // u_2 tem 0 → escolhido
    const result = await resolveLeadOwner("ws_1", lead);
    expect(result.ok && result.value).toBe("u_2");
  });

  it("sem membros → null", async () => {
    routingRepo.listActive.mockResolvedValue(ok([]));
    memberRepo.listByWorkspaceId.mockResolvedValue(ok([]));
    const result = await resolveLeadOwner("ws_1", lead);
    expect(result.ok && result.value).toBeNull();
  });
});
