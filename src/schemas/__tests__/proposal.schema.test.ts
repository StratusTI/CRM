import { describe, expect, it } from "vitest";
import {
  CreateProposalSchema,
  RecordViewSchema,
  UpdateProposalSchema,
} from "@/src/schemas/proposal.schema";

describe("CreateProposalSchema", () => {
  it("aceita título e content opcional", () => {
    const parsed = CreateProposalSchema.safeParse({ title: "  Proposta X  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Proposta X");
      expect(parsed.data.content).toBeUndefined();
    }
  });

  it("rejeita título vazio", () => {
    expect(CreateProposalSchema.safeParse({ title: "   " }).success).toBe(
      false,
    );
  });
});

describe("UpdateProposalSchema", () => {
  it("permite alternar status", () => {
    const parsed = UpdateProposalSchema.safeParse({ status: "PUBLISHED" });
    expect(parsed.success).toBe(true);
  });

  it("rejeita objeto vazio", () => {
    expect(UpdateProposalSchema.safeParse({}).success).toBe(false);
  });

  it("rejeita status inválido", () => {
    expect(
      UpdateProposalSchema.safeParse({ status: "ONLINE" }).success,
    ).toBe(false);
  });
});

describe("RecordViewSchema", () => {
  it("aplica defaults e aceita viewId", () => {
    const parsed = RecordViewSchema.safeParse({ viewId: "abcd1234efgh" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.durationMs).toBe(0);
      expect(parsed.data.reachedEnd).toBe(false);
      expect(parsed.data.scrolledPct).toBe(0);
    }
  });

  it("rejeita viewId curto", () => {
    expect(RecordViewSchema.safeParse({ viewId: "x" }).success).toBe(false);
  });

  it("rejeita scrolledPct fora de 0..100", () => {
    expect(
      RecordViewSchema.safeParse({ viewId: "abcd1234efgh", scrolledPct: 150 })
        .success,
    ).toBe(false);
  });
});
