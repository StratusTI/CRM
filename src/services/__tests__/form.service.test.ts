import { beforeEach, describe, expect, it, vi } from "vitest";
import { LEAD_FIELDS } from "@/src/__tests__/factories/form.factory";
import { ok } from "@/src/lib/result";

const formRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByPublicToken: vi.fn(),
  listByWorkspace: vi.fn(),
  reorder: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  listSubmissions: vi.fn(),
  listSubmissionsByWorkspace: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
}));

vi.mock("@/src/repositories/form.repository", () => ({
  FormRepository: formRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { FormService } from "@/src/services/form.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

function form(overrides: Record<string, unknown> = {}) {
  return {
    id: "f_1",
    name: "Contato",
    description: null,
    status: "DRAFT",
    action: "LEAD",
    publicToken: "tok_1",
    fields: LEAD_FIELDS,
    actionConfig: {},
    successMessage: null,
    redirectUrl: null,
    submissionCount: 0,
    position: 1,
    publishedAt: null,
    workspaceId: WS,
    createdById: "user_1",
    updatedById: null,
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
  for (const fn of Object.values(formRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("FormService.create", () => {
  it("gera publicToken e escopa à workspace", async () => {
    asMember();
    formRepo.create.mockResolvedValue(ok(form()));
    const result = await FormService.create("user_1", "acme", {
      name: "Contato",
      action: "LEAD",
      fields: LEAD_FIELDS,
    });
    expect(result.ok).toBe(true);
    const args = formRepo.create.mock.calls[0][0];
    expect(args.workspaceId).toBe(WS);
    expect(args.publicToken).toEqual(expect.any(String));
    expect(args.publicToken.length).toBeGreaterThanOrEqual(16);
  });

  it("WORKSPACE_NOT_FOUND para não-membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));
    const result = await FormService.create("user_1", "acme", {
      name: "X",
      action: "LEAD",
      fields: LEAD_FIELDS,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
    expect(formRepo.create).not.toHaveBeenCalled();
  });
});

describe("FormService.update", () => {
  it("carimba publishedAt no 1º publish", async () => {
    asMember();
    formRepo.findById.mockResolvedValue(ok(form()));
    formRepo.update.mockResolvedValue(
      ok(form({ status: "PUBLISHED", publishedAt: D })),
    );
    await FormService.update("user_1", "acme", "f_1", { status: "PUBLISHED" });
    const data = formRepo.update.mock.calls[0][1];
    expect(data.publishedAt).toBeInstanceOf(Date);
  });

  it("não reescreve publishedAt já existente", async () => {
    asMember();
    formRepo.findById.mockResolvedValue(
      ok(form({ status: "PUBLISHED", publishedAt: D })),
    );
    formRepo.update.mockResolvedValue(ok(form()));
    await FormService.update("user_1", "acme", "f_1", { status: "PUBLISHED" });
    const data = formRepo.update.mock.calls[0][1];
    expect(data.publishedAt).toBeUndefined();
  });

  it("FORM_NOT_FOUND para outra workspace", async () => {
    asMember();
    formRepo.findById.mockResolvedValue(ok(form({ workspaceId: "ws_2" })));
    const result = await FormService.update("user_1", "acme", "f_1", {
      name: "Novo",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORM_NOT_FOUND");
  });
});

describe("FormService.getPublicByToken", () => {
  it("FORM_NOT_FOUND quando token não existe", async () => {
    formRepo.findByPublicToken.mockResolvedValue(ok(null));
    const result = await FormService.getPublicByToken("nope");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORM_NOT_FOUND");
  });

  it("FORM_NOT_PUBLISHED para rascunho", async () => {
    formRepo.findByPublicToken.mockResolvedValue(ok(form()));
    const result = await FormService.getPublicByToken("tok_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORM_NOT_PUBLISHED");
  });

  it("expõe apenas campos públicos quando publicado", async () => {
    formRepo.findByPublicToken.mockResolvedValue(
      ok(form({ status: "PUBLISHED" })),
    );
    const result = await FormService.getPublicByToken("tok_1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fields[0]).not.toHaveProperty("mapping");
    }
  });
});

describe("FormService.reorder", () => {
  it("delega ao repo com o workspace resolvido", async () => {
    asMember();
    formRepo.reorder.mockResolvedValue(ok(true));
    const result = await FormService.reorder("user_1", "acme", ["f_2", "f_1"]);
    expect(result.ok).toBe(true);
    expect(formRepo.reorder).toHaveBeenCalledWith(WS, ["f_2", "f_1"]);
  });
});
