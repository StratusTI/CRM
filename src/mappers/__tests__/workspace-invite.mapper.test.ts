import { describe, expect, it } from "vitest";
import {
  toPublicInviteDTO,
  toWorkspaceInviteDTO,
} from "@/src/mappers/workspace-invite.mapper";

const now = new Date("2026-05-26T12:00:00Z");

describe("workspace-invite.mapper", () => {
  it("toWorkspaceInviteDTO constrói URL absoluta com o token", () => {
    const dto = toWorkspaceInviteDTO(
      {
        id: "inv1",
        workspaceId: "ws1",
        token: "tok-abc",
        role: "ADMIN",
        isActive: true,
        createdById: "u1",
        createdAt: now,
        updatedAt: now,
      },
      "https://app.example.com",
    );
    expect(dto.url).toBe("https://app.example.com/invite/tok-abc");
    expect(dto.role).toBe("ADMIN");
    expect(dto.isActive).toBe(true);
  });

  it("toWorkspaceInviteDTO degrada OWNER para MEMBER (defesa)", () => {
    const dto = toWorkspaceInviteDTO(
      {
        id: "inv2",
        workspaceId: "ws2",
        token: "tok",
        role: "OWNER",
        isActive: true,
        createdById: "u1",
        createdAt: now,
        updatedAt: now,
      },
      "https://x.test",
    );
    expect(dto.role).toBe("MEMBER");
  });

  it("toPublicInviteDTO não expõe token nem isActive", () => {
    const dto = toPublicInviteDTO({
      id: "inv1",
      workspaceId: "ws1",
      token: "secret-token",
      role: "MEMBER",
      isActive: true,
      createdById: "u1",
      createdAt: now,
      updatedAt: now,
      workspace: {
        id: "ws1",
        name: "Acme",
        slug: "acme",
        createdAt: now,
        updatedAt: now,
      },
    });
    expect(dto).toEqual({
      workspaceName: "Acme",
      workspaceSlug: "acme",
      role: "MEMBER",
    });
  });
});
