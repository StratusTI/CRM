import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const noteRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));
const companyRepo = vi.hoisted(() => ({ existsInWorkspace: vi.fn() }));
const personRepo = vi.hoisted(() => ({ existsInWorkspace: vi.fn() }));
const oppRepo = vi.hoisted(() => ({ existsInWorkspace: vi.fn() }));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock("@/src/repositories/note.repository", () => ({
  NoteRepository: noteRepo,
}));
vi.mock("@/src/repositories/company.repository", () => ({
  CompanyRepository: companyRepo,
}));
vi.mock("@/src/repositories/person.repository", () => ({
  PersonRepository: personRepo,
}));
vi.mock("@/src/repositories/opportunity.repository", () => ({
  OpportunityRepository: oppRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { NoteService } from "@/src/services/note.service";

const WS = "ws_1";

function note(overrides: Record<string, unknown> = {}) {
  return {
    id: "n_1",
    title: "Reunião",
    body: "ata",
    companyId: null,
    personId: null,
    opportunityId: null,
    workspaceId: WS,
    createdById: "user_1",
    updatedById: null,
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
  for (const fn of Object.values(noteRepo)) fn.mockReset();
  for (const fn of Object.values(companyRepo)) fn.mockReset();
  for (const fn of Object.values(personRepo)) fn.mockReset();
  for (const fn of Object.values(oppRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("NoteService.create", () => {
  it("valida relação person (PERSON_NOT_FOUND)", async () => {
    asMember();
    personRepo.existsInWorkspace.mockResolvedValue(ok(false));
    const result = await NoteService.create("user_1", "acme", {
      body: "x",
      personId: "p_x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERSON_NOT_FOUND");
    expect(noteRepo.create).not.toHaveBeenCalled();
  });

  it("cria a nota quando referências são válidas", async () => {
    asMember();
    companyRepo.existsInWorkspace.mockResolvedValue(ok(true));
    noteRepo.create.mockResolvedValue(ok(note({ companyId: "co_1" })));
    const result = await NoteService.create("user_1", "acme", {
      title: "Reunião",
      companyId: "co_1",
    });
    expect(result.ok).toBe(true);
    expect(noteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WS, createdById: "user_1" }),
    );
  });
});

describe("NoteService.getById", () => {
  it("NOTE_NOT_FOUND para outra workspace", async () => {
    asMember();
    noteRepo.findById.mockResolvedValue(ok(note({ workspaceId: "ws_2" })));
    const result = await NoteService.getById("user_1", "acme", "n_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOTE_NOT_FOUND");
  });
});

describe("NoteService.remove", () => {
  it("soft delete da nota", async () => {
    asMember();
    noteRepo.findById.mockResolvedValue(ok(note()));
    noteRepo.softDelete.mockResolvedValue(ok(note({ deletedAt: new Date() })));
    const result = await NoteService.remove("user_1", "acme", "n_1");
    expect(result.ok).toBe(true);
    expect(noteRepo.softDelete).toHaveBeenCalledWith("n_1", "user_1");
  });
});
