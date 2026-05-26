import { describe, expect, it } from "vitest";
import {
  UpdateWorkspaceInviteSchema,
  WorkspaceInviteRoleSchema,
} from "@/src/schemas/workspace-invite.schema";

describe("WorkspaceInviteRoleSchema", () => {
  it("aceita MEMBER e ADMIN", () => {
    expect(WorkspaceInviteRoleSchema.safeParse("MEMBER").success).toBe(true);
    expect(WorkspaceInviteRoleSchema.safeParse("ADMIN").success).toBe(true);
  });

  it("rejeita OWNER (não pode ser distribuído por link)", () => {
    expect(WorkspaceInviteRoleSchema.safeParse("OWNER").success).toBe(false);
  });
});

describe("UpdateWorkspaceInviteSchema", () => {
  it("aceita toggle de isActive", () => {
    expect(
      UpdateWorkspaceInviteSchema.safeParse({ isActive: false }).success,
    ).toBe(true);
  });

  it("aceita troca de role", () => {
    expect(
      UpdateWorkspaceInviteSchema.safeParse({ role: "ADMIN" }).success,
    ).toBe(true);
  });

  it("aceita regenerate: true", () => {
    expect(
      UpdateWorkspaceInviteSchema.safeParse({ regenerate: true }).success,
    ).toBe(true);
  });

  it("aceita combinação", () => {
    expect(
      UpdateWorkspaceInviteSchema.safeParse({
        isActive: true,
        role: "MEMBER",
        regenerate: true,
      }).success,
    ).toBe(true);
  });

  it("rejeita objeto vazio", () => {
    expect(UpdateWorkspaceInviteSchema.safeParse({}).success).toBe(false);
  });

  it("rejeita regenerate: false sozinho", () => {
    expect(
      UpdateWorkspaceInviteSchema.safeParse({ regenerate: false }).success,
    ).toBe(false);
  });
});
