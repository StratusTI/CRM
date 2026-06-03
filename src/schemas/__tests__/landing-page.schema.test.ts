import { describe, expect, it } from "vitest";
import {
  CreateLandingPageSchema,
  RecordLandingEventSchema,
  SlugSchema,
  UpdateLandingPageSchema,
} from "@/src/schemas/landing-page.schema";

describe("CreateLandingPageSchema", () => {
  it("aceita título e html opcional", () => {
    const parsed = CreateLandingPageSchema.safeParse({ title: "  Promo  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Promo");
      expect(parsed.data.html).toBeUndefined();
    }
  });

  it("rejeita título vazio", () => {
    expect(CreateLandingPageSchema.safeParse({ title: "   " }).success).toBe(
      false,
    );
  });
});

describe("SlugSchema", () => {
  it("normaliza para minúsculas e aceita hífens", () => {
    const parsed = SlugSchema.safeParse("Promo-Verao-2026");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe("promo-verao-2026");
  });

  it("rejeita espaços e caracteres inválidos", () => {
    expect(SlugSchema.safeParse("promo verão").success).toBe(false);
    expect(SlugSchema.safeParse("promo_verao").success).toBe(false);
    expect(SlugSchema.safeParse("-promo-").success).toBe(false);
  });
});

describe("UpdateLandingPageSchema", () => {
  it("permite alternar status", () => {
    expect(
      UpdateLandingPageSchema.safeParse({ status: "PUBLISHED" }).success,
    ).toBe(true);
  });

  it("rejeita objeto vazio", () => {
    expect(UpdateLandingPageSchema.safeParse({}).success).toBe(false);
  });

  it("rejeita status inválido", () => {
    expect(
      UpdateLandingPageSchema.safeParse({ status: "ONLINE" }).success,
    ).toBe(false);
  });
});

describe("RecordLandingEventSchema", () => {
  it("aplica defaults e aceita viewId", () => {
    const parsed = RecordLandingEventSchema.safeParse({
      viewId: "abcd1234efgh",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.durationMs).toBe(0);
      expect(parsed.data.ctaClicks).toBe(0);
    }
  });

  it("rejeita viewId curto", () => {
    expect(RecordLandingEventSchema.safeParse({ viewId: "x" }).success).toBe(
      false,
    );
  });

  it("rejeita ctaClicks negativo", () => {
    expect(
      RecordLandingEventSchema.safeParse({
        viewId: "abcd1234efgh",
        ctaClicks: -1,
      }).success,
    ).toBe(false);
  });
});
