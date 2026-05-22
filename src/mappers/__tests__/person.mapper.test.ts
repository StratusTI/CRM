import type { Person } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toPersonDTO } from "@/src/mappers/person.mapper";

const person: Person = {
  id: "p_1",
  name: "Ada",
  emails: ["ada@example.com"],
  phones: ["+55 11 99999-0000"],
  city: "Recife",
  jobTitle: "CTO",
  linkedin: null,
  avatar: null,
  companyId: "co_1",
  workspaceId: "ws_1",
  createdById: "user_1",
  updatedById: null,
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
};

describe("toPersonDTO", () => {
  it("serializa datas e preserva arrays/nulos", () => {
    expect(toPersonDTO(person)).toEqual({
      id: "p_1",
      name: "Ada",
      emails: ["ada@example.com"],
      phones: ["+55 11 99999-0000"],
      city: "Recife",
      jobTitle: "CTO",
      linkedin: null,
      avatar: null,
      companyId: "co_1",
      workspaceId: "ws_1",
      createdById: "user_1",
      updatedById: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      deletedAt: null,
    });
  });
});
