import type { Note } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toNoteDTO } from "@/src/mappers/note.mapper";

const base: Note = {
  id: "n_1",
  title: "Reunião",
  body: "ata",
  companyId: "co_1",
  personId: null,
  opportunityId: null,
  workspaceId: "ws_1",
  createdById: "user_1",
  updatedById: null,
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
};

describe("toNoteDTO", () => {
  it("serializa datas e preserva relação/nulos", () => {
    expect(toNoteDTO(base)).toEqual({
      id: "n_1",
      title: "Reunião",
      body: "ata",
      companyId: "co_1",
      personId: null,
      opportunityId: null,
      workspaceId: "ws_1",
      createdById: "user_1",
      updatedById: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      deletedAt: null,
    });
  });
});
