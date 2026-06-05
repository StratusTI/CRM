import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const templateRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
}));

vi.mock("@/src/repositories/email-template.repository", () => ({
  EmailTemplateRepository: templateRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { EmailTemplateService } from "@/src/services/email-template.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

function template(overrides: Record<string, unknown> = {}) {
  return {
    id: "t_1",
    name: "Boas-vindas",
    subject: "Olá",
    contentHtml: "<p>oi</p>",
    contentJson: null,
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
  for (const fn of Object.values(templateRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("EmailTemplateService.create", () => {
  it("normaliza contentJson ausente para null e escopa", async () => {
    asMember();
    templateRepo.create.mockResolvedValue(ok(template()));
    const result = await EmailTemplateService.create("user_1", "acme", {
      name: "Boas-vindas",
      subject: "",
      contentHtml: "",
    });
    expect(result.ok).toBe(true);
    const args = templateRepo.create.mock.calls[0][0];
    expect(args.contentJson).toBeNull();
    expect(args.workspaceId).toBe(WS);
  });
});

describe("EmailTemplateService.getById", () => {
  it("EMAIL_TEMPLATE_NOT_FOUND para outra workspace", async () => {
    asMember();
    templateRepo.findById.mockResolvedValue(
      ok(template({ workspaceId: "ws_2" })),
    );
    const result = await EmailTemplateService.getById("user_1", "acme", "t_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("EMAIL_TEMPLATE_NOT_FOUND");
  });

  it("EMAIL_TEMPLATE_NOT_FOUND para deletado", async () => {
    asMember();
    templateRepo.findById.mockResolvedValue(ok(template({ deletedAt: D })));
    const result = await EmailTemplateService.getById("user_1", "acme", "t_1");
    expect(result.ok).toBe(false);
  });

  it("retorna DTO quando válido", async () => {
    asMember();
    templateRepo.findById.mockResolvedValue(ok(template()));
    const result = await EmailTemplateService.getById("user_1", "acme", "t_1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe("t_1");
  });
});

describe("EmailTemplateService.update", () => {
  it("carimba updatedById e repassa input", async () => {
    asMember();
    templateRepo.findById.mockResolvedValue(ok(template()));
    templateRepo.update.mockResolvedValue(ok(template({ subject: "Novo" })));
    const result = await EmailTemplateService.update("user_1", "acme", "t_1", {
      subject: "Novo",
    });
    expect(result.ok).toBe(true);
    const args = templateRepo.update.mock.calls[0][1];
    expect(args.updatedById).toBe("user_1");
    expect(args.subject).toBe("Novo");
  });

  it("nega update em template inexistente", async () => {
    asMember();
    templateRepo.findById.mockResolvedValue(ok(null));
    const result = await EmailTemplateService.update("user_1", "acme", "t_1", {
      subject: "Novo",
    });
    expect(result.ok).toBe(false);
    expect(templateRepo.update).not.toHaveBeenCalled();
  });
});

describe("EmailTemplateService.remove", () => {
  it("soft-delete com o autor", async () => {
    asMember();
    templateRepo.findById.mockResolvedValue(ok(template()));
    templateRepo.softDelete.mockResolvedValue(ok(template({ deletedAt: D })));
    const result = await EmailTemplateService.remove("user_1", "acme", "t_1");
    expect(result.ok).toBe(true);
    expect(templateRepo.softDelete).toHaveBeenCalledWith("t_1", "user_1");
  });
});
