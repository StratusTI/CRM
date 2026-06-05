import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const listRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  addMembers: vi.fn(),
  removeMember: vi.fn(),
  getMembersByListIds: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
}));

vi.mock("@/src/repositories/mailing-list.repository", () => ({
  MailingListRepository: listRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { MailingListService } from "@/src/services/mailing-list.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

function list(overrides: Record<string, unknown> = {}) {
  return {
    id: "l_1",
    name: "Leads",
    description: null,
    workspaceId: WS,
    createdById: "user_1",
    createdAt: D,
    updatedAt: D,
    members: [],
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(listRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("MailingListService.create", () => {
  it("escopa à workspace e zera memberCount", async () => {
    asMember();
    listRepo.create.mockResolvedValue(ok(list()));
    const result = await MailingListService.create("user_1", "acme", {
      name: "Leads",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.memberCount).toBe(0);
    expect(listRepo.create.mock.calls[0][0].workspaceId).toBe(WS);
  });

  it("WORKSPACE_NOT_FOUND para não-membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));
    const result = await MailingListService.create("user_1", "acme", {
      name: "X",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
    expect(listRepo.create).not.toHaveBeenCalled();
  });
});

describe("MailingListService.list", () => {
  it("mapeia _count.members em memberCount", async () => {
    asMember();
    listRepo.listByWorkspace.mockResolvedValue(
      ok([{ ...list(), _count: { members: 3 } }]),
    );
    const result = await MailingListService.list("user_1", "acme");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].memberCount).toBe(3);
  });
});

describe("MailingListService.getById", () => {
  it("MAILING_LIST_NOT_FOUND para outra workspace", async () => {
    asMember();
    listRepo.findById.mockResolvedValue(ok(list({ workspaceId: "ws_2" })));
    const result = await MailingListService.getById("user_1", "acme", "l_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("MAILING_LIST_NOT_FOUND");
  });

  it("retorna a lista com membros quando na workspace", async () => {
    asMember();
    listRepo.findById.mockResolvedValue(
      ok(
        list({
          members: [
            {
              id: "mem_1",
              mailingListId: "l_1",
              email: "a@b.com",
              name: null,
              personId: null,
              createdAt: D,
            },
          ],
        }),
      ),
    );
    const result = await MailingListService.getById("user_1", "acme", "l_1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.members).toHaveLength(1);
  });
});

describe("MailingListService.addMembers", () => {
  it("recarrega a lista após adicionar", async () => {
    asMember();
    listRepo.findById.mockResolvedValueOnce(ok(list())).mockResolvedValueOnce(
      ok(
        list({
          members: [
            {
              id: "mem_1",
              mailingListId: "l_1",
              email: "a@b.com",
              name: null,
              personId: null,
              createdAt: D,
            },
          ],
        }),
      ),
    );
    listRepo.addMembers.mockResolvedValue(ok(undefined));
    const result = await MailingListService.addMembers(
      "user_1",
      "acme",
      "l_1",
      {
        members: [{ email: "a@b.com" }],
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.memberCount).toBe(1);
  });
});

describe("MailingListService.remove / removeMember", () => {
  it("remove a lista quando na workspace", async () => {
    asMember();
    listRepo.findById.mockResolvedValue(ok(list()));
    listRepo.softDelete.mockResolvedValue(ok(undefined));
    const result = await MailingListService.remove("user_1", "acme", "l_1");
    expect(result.ok).toBe(true);
    expect(listRepo.softDelete).toHaveBeenCalledWith("l_1");
  });

  it("removeMember nega lista de outra workspace", async () => {
    asMember();
    listRepo.findById.mockResolvedValue(ok(list({ workspaceId: "ws_2" })));
    const result = await MailingListService.removeMember(
      "user_1",
      "acme",
      "l_1",
      "mem_1",
    );
    expect(result.ok).toBe(false);
    expect(listRepo.removeMember).not.toHaveBeenCalled();
  });
});
