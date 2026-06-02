import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const proposalRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByShareToken: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  reorder: vi.fn(),
  recordView: vi.fn(),
  metricsFor: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock("@/src/repositories/proposal.repository", () => ({
  ProposalRepository: proposalRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { ProposalService } from "@/src/services/proposal.service";

const WS = "ws_1";

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    id: "p_1",
    title: "Proposta",
    content: "<p>oi</p>",
    status: "DRAFT",
    shareToken: "tok_1",
    publishedAt: null,
    workspaceId: WS,
    createdById: "user_1",
    updatedById: null,
    position: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS, slug: "acme" } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(proposalRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("ProposalService.create", () => {
  it("gera shareToken e escopa à workspace + criador", async () => {
    asMember();
    proposalRepo.create.mockResolvedValue(ok(proposal()));
    const result = await ProposalService.create("user_1", "acme", {
      title: "Proposta",
    });
    expect(result.ok).toBe(true);
    const args = proposalRepo.create.mock.calls[0][0];
    expect(args).toEqual(
      expect.objectContaining({ workspaceId: WS, createdById: "user_1" }),
    );
    expect(args.shareToken).toEqual(expect.any(String));
    expect(args.shareToken.length).toBeGreaterThanOrEqual(16);
  });

  it("WORKSPACE_NOT_FOUND para não-membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));
    const result = await ProposalService.create("user_1", "acme", {
      title: "Proposta",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
    expect(proposalRepo.create).not.toHaveBeenCalled();
  });
});

describe("ProposalService.update", () => {
  it("carimba publishedAt no 1º publish", async () => {
    asMember();
    proposalRepo.findById.mockResolvedValue(ok(proposal()));
    proposalRepo.update.mockResolvedValue(
      ok(proposal({ status: "PUBLISHED", publishedAt: new Date() })),
    );
    await ProposalService.update("user_1", "acme", "p_1", {
      status: "PUBLISHED",
    });
    const data = proposalRepo.update.mock.calls[0][1];
    expect(data.publishedAt).toBeInstanceOf(Date);
  });

  it("não reescreve publishedAt se já publicado antes", async () => {
    asMember();
    const firstPublish = new Date("2026-01-01T00:00:00.000Z");
    proposalRepo.findById.mockResolvedValue(
      ok(proposal({ status: "PUBLISHED", publishedAt: firstPublish })),
    );
    proposalRepo.update.mockResolvedValue(ok(proposal()));
    await ProposalService.update("user_1", "acme", "p_1", {
      status: "PUBLISHED",
    });
    const data = proposalRepo.update.mock.calls[0][1];
    expect(data.publishedAt).toBeUndefined();
  });
});

describe("ProposalService.getById", () => {
  it("PROPOSAL_NOT_FOUND para outra workspace", async () => {
    asMember();
    proposalRepo.findById.mockResolvedValue(
      ok(proposal({ workspaceId: "ws_2" })),
    );
    const result = await ProposalService.getById("user_1", "acme", "p_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PROPOSAL_NOT_FOUND");
  });
});

describe("ProposalService.getPublicByToken", () => {
  it("404 quando token não existe", async () => {
    proposalRepo.findByShareToken.mockResolvedValue(ok(null));
    const result = await ProposalService.getPublicByToken("nope");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PROPOSAL_NOT_FOUND");
  });

  it("PROPOSAL_NOT_PUBLISHED para rascunho", async () => {
    proposalRepo.findByShareToken.mockResolvedValue(ok(proposal()));
    const result = await ProposalService.getPublicByToken("tok_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PROPOSAL_NOT_PUBLISHED");
  });

  it("expõe só id/título/conteúdo quando publicada", async () => {
    proposalRepo.findByShareToken.mockResolvedValue(
      ok(proposal({ status: "PUBLISHED" })),
    );
    const result = await ProposalService.getPublicByToken("tok_1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value).sort()).toEqual([
        "content",
        "id",
        "title",
      ]);
    }
  });
});

describe("ProposalService.recordView", () => {
  it("hasheia o IP e não guarda o IP cru", async () => {
    proposalRepo.findByShareToken.mockResolvedValue(
      ok(proposal({ status: "PUBLISHED" })),
    );
    proposalRepo.recordView.mockResolvedValue(ok({}));
    const result = await ProposalService.recordView(
      "tok_1",
      {
        viewId: "sess-123456",
        durationMs: 1000,
        reachedEnd: true,
        scrolledPct: 100,
      },
      { ip: "203.0.113.5", referrer: null },
    );
    expect(result.ok).toBe(true);
    const args = proposalRepo.recordView.mock.calls[0][0];
    expect(args.ipHash).toEqual(expect.any(String));
    expect(args.ipHash).not.toContain("203.0.113.5");
    expect(args.ipHash.length).toBe(64); // sha256 hex
  });

  it("recusa visita em proposta não publicada", async () => {
    proposalRepo.findByShareToken.mockResolvedValue(ok(proposal()));
    const result = await ProposalService.recordView(
      "tok_1",
      {
        viewId: "sess-123456",
        durationMs: 0,
        reachedEnd: false,
        scrolledPct: 0,
      },
      { ip: "203.0.113.5", referrer: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PROPOSAL_NOT_PUBLISHED");
    expect(proposalRepo.recordView).not.toHaveBeenCalled();
  });
});
