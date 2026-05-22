import { describe, expect, it } from "vitest";
import {
  CreateWorkspaceSchema,
  WorkspaceSlugSchema,
} from "@/src/schemas/workspace.schema";

describe("CreateWorkspaceSchema", () => {
  it("aceita apenas o nome (slug é opcional)", () => {
    const result = CreateWorkspaceSchema.safeParse({ name: "Acme Inc." });
    expect(result.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    expect(CreateWorkspaceSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
  });

  it("aceita slug válido", () => {
    const result = CreateWorkspaceSchema.safeParse({
      name: "Acme",
      slug: "acme-team",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita slug com maiúsculas/espaços inválidos", () => {
    expect(
      CreateWorkspaceSchema.safeParse({ name: "Acme", slug: "Acme Team!" })
        .success,
    ).toBe(false);
  });
});

describe("WorkspaceSlugSchema", () => {
  it("normaliza para minúsculas", () => {
    const result = WorkspaceSlugSchema.safeParse("ACME");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("acme");
  });

  it("rejeita slug com menos de 2 caracteres", () => {
    expect(WorkspaceSlugSchema.safeParse("a").success).toBe(false);
  });
});
