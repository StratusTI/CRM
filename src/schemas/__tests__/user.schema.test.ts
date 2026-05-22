import { describe, expect, it } from "vitest";
import {
  AcceptConsentSchema,
  UpdateProfileSchema,
} from "@/src/schemas/user.schema";

describe("UpdateProfileSchema", () => {
  it("aceita atualização só de nome", () => {
    expect(UpdateProfileSchema.safeParse({ name: "Novo Nome" }).success).toBe(
      true,
    );
  });

  it("aceita image nula (remoção do avatar)", () => {
    expect(UpdateProfileSchema.safeParse({ image: null }).success).toBe(true);
  });

  it("rejeita payload vazio", () => {
    expect(UpdateProfileSchema.safeParse({}).success).toBe(false);
  });

  it("rejeita image que não é URL", () => {
    expect(UpdateProfileSchema.safeParse({ image: "não-é-url" }).success).toBe(
      false,
    );
  });
});

describe("AcceptConsentSchema", () => {
  it("aceita quando ambos são true", () => {
    expect(
      AcceptConsentSchema.safeParse({ acceptTerms: true, acceptPrivacy: true })
        .success,
    ).toBe(true);
  });

  it("rejeita quando algum aceite é false", () => {
    expect(
      AcceptConsentSchema.safeParse({ acceptTerms: true, acceptPrivacy: false })
        .success,
    ).toBe(false);
  });
});
