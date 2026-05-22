import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const taskRepo = vi.hoisted(() => ({
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

vi.mock("@/src/repositories/task.repository", () => ({
  TaskRepository: taskRepo,
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

import { TaskService } from "@/src/services/task.service";

const WS = "ws_1";

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: "t_1",
    title: "Ligar",
    status: "TODO",
    body: null,
    dueDate: null,
    assigneeId: null,
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
  for (const fn of Object.values(taskRepo)) fn.mockReset();
  for (const fn of Object.values(companyRepo)) fn.mockReset();
  for (const fn of Object.values(personRepo)) fn.mockReset();
  for (const fn of Object.values(oppRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("TaskService.create", () => {
  it("valida relação opportunity (OPPORTUNITY_NOT_FOUND)", async () => {
    asMember();
    oppRepo.existsInWorkspace.mockResolvedValue(ok(false));
    const result = await TaskService.create("user_1", "acme", {
      title: "X",
      status: "TODO",
      opportunityId: "op_x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("OPPORTUNITY_NOT_FOUND");
    expect(taskRepo.create).not.toHaveBeenCalled();
  });

  it("converte dueDate ISO em Date", async () => {
    asMember();
    taskRepo.create.mockResolvedValue(ok(task()));
    await TaskService.create("user_1", "acme", {
      title: "X",
      status: "TODO",
      dueDate: "2026-06-01T00:00:00.000Z",
    });
    const arg = taskRepo.create.mock.calls[0][0];
    expect(arg.dueDate).toBeInstanceOf(Date);
  });
});

describe("TaskService.getById", () => {
  it("TASK_NOT_FOUND para outra workspace", async () => {
    asMember();
    taskRepo.findById.mockResolvedValue(ok(task({ workspaceId: "ws_2" })));
    const result = await TaskService.getById("user_1", "acme", "t_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("TASK_NOT_FOUND");
  });
});

describe("TaskService.update", () => {
  it("registra updatedById e mantém status quando só muda body", async () => {
    asMember();
    taskRepo.findById.mockResolvedValue(ok(task()));
    taskRepo.update.mockResolvedValue(ok(task({ body: "novo" })));
    await TaskService.update("user_2", "acme", "t_1", { body: "novo" });
    const arg = taskRepo.update.mock.calls[0][1];
    expect(arg.updatedById).toBe("user_2");
    expect(arg.dueDate).toBeUndefined();
  });
});
