import { describe, expect, it } from "vitest";
import {
  CreateProfileSchema,
  UpdateProfileSchema,
} from "@/src/schemas/profile.schema";

describe("CreateProfileSchema", () => {
  it("aceita nome + permissões", () => {
    const r = CreateProfileSchema.safeParse({
      name: "Somente leitura",
      permissions: { companies: ["VIEW"], people: ["VIEW"] },
    });
    expect(r.success).toBe(true);
  });

  it("rejeita ação inválida", () => {
    const r = CreateProfileSchema.safeParse({
      name: "X",
      permissions: { companies: ["FLY"] },
    });
    expect(r.success).toBe(false);
  });

  it("rejeita sem nome", () => {
    expect(CreateProfileSchema.safeParse({ permissions: {} }).success).toBe(
      false,
    );
  });
});

describe("UpdateProfileSchema", () => {
  it("aceita parcial e rejeita vazio", () => {
    expect(UpdateProfileSchema.safeParse({ name: "Novo" }).success).toBe(true);
    expect(UpdateProfileSchema.safeParse({}).success).toBe(false);
  });
});
