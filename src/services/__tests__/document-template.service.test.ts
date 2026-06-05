import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const templateRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  listByWorkspace: vi.fn(),
  softDelete: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
}));

vi.mock("@/src/repositories/document-template.repository", () => ({
  DocumentTemplateRepository: templateRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { DocumentTemplateService } from "@/src/services/document-template.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

function template(overrides: Record<string, unknown> = {}) {
  return {
    id: "t_1",
    title: "Modelo",
    content: "<p>x</p>",
    type: "PROPOSAL",
    workspaceId: WS,
    createdById: "user_1",
    createdAt: D,
    updatedAt: D,
    deletedAt: null,
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(templateRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("DocumentTemplateService.create", () => {
  it("usa content vazio como default e escopa", async () => {
    asMember();
    templateRepo.create.mockResolvedValue(ok(template()));
    const result = await DocumentTemplateService.create("user_1", "acme", {
      title: "Modelo",
      type: "PROPOSAL",
    });
    expect(result.ok).toBe(true);
    const args = templateRepo.create.mock.calls[0][0];
    expect(args.content).toBe("");
    expect(args.workspaceId).toBe(WS);
  });
});

describe("DocumentTemplateService.list", () => {
  it("repassa o filtro de tipo ao repo", async () => {
    asMember();
    templateRepo.listByWorkspace.mockResolvedValue(ok([template()]));
    const result = await DocumentTemplateService.list(
      "user_1",
      "acme",
      "CONTRACT",
    );
    expect(result.ok).toBe(true);
    expect(templateRepo.listByWorkspace).toHaveBeenCalledWith(WS, "CONTRACT");
  });
});

describe("DocumentTemplateService.remove", () => {
  it("DOCUMENT_TEMPLATE_NOT_FOUND para outra workspace", async () => {
    asMember();
    templateRepo.findById.mockResolvedValue(
      ok(template({ workspaceId: "ws_2" })),
    );
    const result = await DocumentTemplateService.remove(
      "user_1",
      "acme",
      "t_1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DOCUMENT_TEMPLATE_NOT_FOUND");
    }
    expect(templateRepo.softDelete).not.toHaveBeenCalled();
  });

  it("remove quando na workspace", async () => {
    asMember();
    templateRepo.findById.mockResolvedValue(ok(template()));
    templateRepo.softDelete.mockResolvedValue(ok(template({ deletedAt: D })));
    const result = await DocumentTemplateService.remove(
      "user_1",
      "acme",
      "t_1",
    );
    expect(result.ok).toBe(true);
    expect(templateRepo.softDelete).toHaveBeenCalledWith("t_1");
  });
});
