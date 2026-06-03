import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const pageRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  findPublishedBySlug: vi.fn(),
  slugExists: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  reorder: vi.fn(),
  recordEvent: vi.fn(),
  metricsFor: vi.fn(),
  listMessages: vi.fn(),
  appendMessage: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
}));
const workspaceRepo = vi.hoisted(() => ({
  findBySlug: vi.fn(),
}));

vi.mock("@/src/repositories/landing-page.repository", () => ({
  LandingPageRepository: pageRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/repositories/workspace.repository", () => ({
  WorkspaceRepository: workspaceRepo,
}));

import { LandingPageService } from "@/src/services/landing-page.service";

const WS = "ws_1";

function page(overrides: Record<string, unknown> = {}) {
  return {
    id: "lp_1",
    title: "Promo",
    slug: "promo",
    html: "<html></html>",
    status: "DRAFT",
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
  for (const fn of Object.values(pageRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
  for (const fn of Object.values(workspaceRepo)) fn.mockReset();
});

describe("LandingPageService.create", () => {
  it("deriva slug do título e escopa à workspace + criador", async () => {
    asMember();
    pageRepo.slugExists.mockResolvedValue(ok(false));
    pageRepo.create.mockResolvedValue(ok(page()));
    const result = await LandingPageService.create("user_1", "acme", {
      title: "Promo de Verão!",
    });
    expect(result.ok).toBe(true);
    const args = pageRepo.create.mock.calls[0][0];
    expect(args).toEqual(
      expect.objectContaining({ workspaceId: WS, createdById: "user_1" }),
    );
    expect(args.slug).toBe("promo-de-verao");
  });

  it("anexa sufixo numérico em colisão de slug", async () => {
    asMember();
    // primeiro slug existe; o segundo (com -2) está livre.
    pageRepo.slugExists
      .mockResolvedValueOnce(ok(true))
      .mockResolvedValueOnce(ok(false));
    pageRepo.create.mockResolvedValue(ok(page()));
    await LandingPageService.create("user_1", "acme", { title: "Promo" });
    const args = pageRepo.create.mock.calls[0][0];
    expect(args.slug).toBe("promo-2");
  });

  it("WORKSPACE_NOT_FOUND para não-membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));
    const result = await LandingPageService.create("user_1", "acme", {
      title: "Promo",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
    expect(pageRepo.create).not.toHaveBeenCalled();
  });
});

describe("LandingPageService.update", () => {
  it("carimba publishedAt no 1º publish", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page()));
    pageRepo.update.mockResolvedValue(
      ok(page({ status: "PUBLISHED", publishedAt: new Date() })),
    );
    await LandingPageService.update("user_1", "acme", "lp_1", {
      status: "PUBLISHED",
    });
    const data = pageRepo.update.mock.calls[0][1];
    expect(data.publishedAt).toBeInstanceOf(Date);
  });

  it("rejeita slug já em uso", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page()));
    pageRepo.slugExists.mockResolvedValue(ok(true));
    const result = await LandingPageService.update("user_1", "acme", "lp_1", {
      slug: "ocupado",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("LANDING_PAGE_SLUG_TAKEN");
    expect(pageRepo.update).not.toHaveBeenCalled();
  });

  it("re-deriva o slug ao renomear o título (slug auto-derivado)", async () => {
    asMember();
    // slug "promo" === slugify("Promo") ⇒ auto-derivado.
    pageRepo.findById.mockResolvedValue(ok(page()));
    pageRepo.slugExists.mockResolvedValue(ok(false));
    pageRepo.update.mockResolvedValue(ok(page()));
    await LandingPageService.update("user_1", "acme", "lp_1", {
      title: "Nova Campanha",
    });
    const data = pageRepo.update.mock.calls[0][1];
    expect(data.slug).toBe("nova-campanha");
  });

  it("preserva slug customizado ao renomear o título", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page({ slug: "url-feita-a-mao" })));
    pageRepo.update.mockResolvedValue(ok(page()));
    await LandingPageService.update("user_1", "acme", "lp_1", {
      title: "Nova Campanha",
    });
    const data = pageRepo.update.mock.calls[0][1];
    expect(data.slug).toBeUndefined();
    expect(pageRepo.slugExists).not.toHaveBeenCalled();
  });
});

describe("LandingPageService.getPublicBySlug", () => {
  it("404 quando workspace não existe", async () => {
    workspaceRepo.findBySlug.mockResolvedValue(ok(null));
    const result = await LandingPageService.getPublicBySlug("nope", "promo");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("LANDING_PAGE_NOT_FOUND");
  });

  it("LANDING_PAGE_NOT_PUBLISHED para rascunho", async () => {
    workspaceRepo.findBySlug.mockResolvedValue(ok({ id: WS, slug: "acme" }));
    pageRepo.findPublishedBySlug.mockResolvedValue(ok(page()));
    const result = await LandingPageService.getPublicBySlug("acme", "promo");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("LANDING_PAGE_NOT_PUBLISHED");
    }
  });

  it("expõe só id/título/html quando publicada", async () => {
    workspaceRepo.findBySlug.mockResolvedValue(ok({ id: WS, slug: "acme" }));
    pageRepo.findPublishedBySlug.mockResolvedValue(
      ok(page({ status: "PUBLISHED" })),
    );
    const result = await LandingPageService.getPublicBySlug("acme", "promo");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value).sort()).toEqual(["html", "id", "title"]);
    }
  });
});

describe("LandingPageService.recordEvent", () => {
  it("hasheia o IP e não guarda o IP cru", async () => {
    workspaceRepo.findBySlug.mockResolvedValue(ok({ id: WS, slug: "acme" }));
    pageRepo.findPublishedBySlug.mockResolvedValue(
      ok(page({ status: "PUBLISHED" })),
    );
    pageRepo.recordEvent.mockResolvedValue(ok(true));
    const result = await LandingPageService.recordEvent(
      "acme",
      "promo",
      { viewId: "sess-123456", durationMs: 1000, ctaClicks: 2 },
      { ip: "203.0.113.5", referrer: "https://google.com" },
    );
    expect(result.ok).toBe(true);
    const args = pageRepo.recordEvent.mock.calls[0][0];
    expect(args.ipHash).toEqual(expect.any(String));
    expect(args.ipHash).not.toContain("203.0.113.5");
    expect(args.ipHash.length).toBe(64); // sha256 hex
    expect(args.ctaClicks).toBe(2);
    expect(args.referrer).toBe("https://google.com");
  });

  it("recusa evento em página não publicada", async () => {
    workspaceRepo.findBySlug.mockResolvedValue(ok({ id: WS, slug: "acme" }));
    pageRepo.findPublishedBySlug.mockResolvedValue(ok(page()));
    const result = await LandingPageService.recordEvent(
      "acme",
      "promo",
      { viewId: "sess-123456", durationMs: 0, ctaClicks: 0 },
      { ip: "203.0.113.5", referrer: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("LANDING_PAGE_NOT_PUBLISHED");
    }
    expect(pageRepo.recordEvent).not.toHaveBeenCalled();
  });
});
