import type { Proposal, ProposalView } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  toProposalDTO,
  toProposalListItemDTO,
  toProposalMetricsDTO,
  toPublicProposalDTO,
} from "@/src/mappers/proposal.mapper";

const baseProposal: Proposal = {
  id: "p1",
  title: "Proposta",
  content: "<p>oi</p>",
  status: "PUBLISHED",
  shareToken: "tok-1",
  publishedAt: new Date("2026-01-02T00:00:00.000Z"),
  workspaceId: "w1",
  createdById: "u1",
  updatedById: null,
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-03T00:00:00.000Z"),
  deletedAt: null,
};

describe("toProposalDTO", () => {
  it("serializa datas em ISO e preserva nulos", () => {
    const dto = toProposalDTO(baseProposal);
    expect(dto.publishedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.deletedAt).toBeNull();
    expect(dto.viewsCount).toBeUndefined();
  });
});

describe("toProposalListItemDTO", () => {
  it("inclui viewsCount do _count", () => {
    const dto = toProposalListItemDTO({
      ...baseProposal,
      _count: { views: 7 },
    });
    expect(dto.viewsCount).toBe(7);
  });
});

describe("toPublicProposalDTO", () => {
  it("expõe só id/título/conteúdo", () => {
    const dto = toPublicProposalDTO(baseProposal);
    expect(dto).toEqual({ id: "p1", title: "Proposta", content: "<p>oi</p>" });
  });
});

describe("toProposalMetricsDTO", () => {
  const view: ProposalView = {
    id: "v1",
    proposalId: "p1",
    viewId: "s1",
    ipHash: "h1",
    durationMs: 1000,
    reachedEnd: true,
    scrolledPct: 100,
    referrer: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("deriva completionRate", () => {
    const dto = toProposalMetricsDTO({
      totalViews: 4,
      uniqueVisitors: 2,
      completed: 1,
      avgDurationMs: 1500,
      views: [view],
    });
    expect(dto.completionRate).toBe(0.25);
    expect(dto.views).toHaveLength(1);
    expect(dto.views[0].id).toBe("v1");
  });

  it("completionRate é 0 sem visitas", () => {
    const dto = toProposalMetricsDTO({
      totalViews: 0,
      uniqueVisitors: 0,
      completed: 0,
      avgDurationMs: 0,
      views: [],
    });
    expect(dto.completionRate).toBe(0);
  });
});
