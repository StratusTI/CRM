import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const scoringRepo = vi.hoisted(() => ({ listActive: vi.fn() }));
vi.mock("@/src/repositories/lead-rule.repository", () => ({
  LeadScoringRuleRepository: scoringRepo,
  LeadRoutingRuleRepository: {},
}));

import { computeLeadScore } from "@/src/services/lead-scoring";

const lead = {
  name: "Maria",
  emails: ["maria@acme.com"],
  phones: ["+5511999998888"],
  company: "Acme",
  jobTitle: "CEO",
  source: "WhatsApp",
  city: null,
};

beforeEach(() => scoringRepo.listActive.mockReset());

describe("computeLeadScore", () => {
  it("soma os pontos das regras que casam", async () => {
    scoringRepo.listActive.mockResolvedValue(
      ok([
        { field: "phone", operator: "is_not_empty", value: null, points: 20 },
        { field: "company", operator: "is_not_empty", value: null, points: 15 },
        { field: "source", operator: "equals", value: "site", points: 50 }, // não casa
      ]),
    );
    const result = await computeLeadScore("ws_1", lead);
    expect(result.ok && result.value).toBe(35);
  });

  it("sem regras → score 0", async () => {
    scoringRepo.listActive.mockResolvedValue(ok([]));
    const result = await computeLeadScore("ws_1", lead);
    expect(result.ok && result.value).toBe(0);
  });
});
