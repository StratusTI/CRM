import type { Workspace } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toWorkspaceDTO } from "@/src/mappers/workspace.mapper";

const workspace: Workspace = {
  id: "ws_1",
  name: "Acme",
  slug: "acme",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("toWorkspaceDTO", () => {
  it("serializa datas em ISO e preserva os campos", () => {
    expect(toWorkspaceDTO(workspace)).toEqual({
      id: "ws_1",
      name: "Acme",
      slug: "acme",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });
});
