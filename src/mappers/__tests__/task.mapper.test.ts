import type { Task } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toTaskDTO } from "@/src/mappers/task.mapper";

const base: Task = {
  id: "t_1",
  title: "Ligar",
  status: "TODO",
  body: "detalhes",
  dueDate: new Date("2026-06-01T00:00:00.000Z"),
  assigneeId: "user_2",
  companyId: "co_1",
  personId: "p_1",
  opportunityId: "op_1",
  workspaceId: "ws_1",
  createdById: "user_1",
  updatedById: null,
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
};

describe("toTaskDTO", () => {
  it("serializa datas e preserva relações", () => {
    const dto = toTaskDTO(base);
    expect(dto.dueDate).toBe("2026-06-01T00:00:00.000Z");
    expect(dto.status).toBe("TODO");
    expect(dto.companyId).toBe("co_1");
    expect(dto.personId).toBe("p_1");
    expect(dto.opportunityId).toBe("op_1");
  });

  it("preserva dueDate nulo", () => {
    expect(toTaskDTO({ ...base, dueDate: null }).dueDate).toBeNull();
  });
});
