import { describe, expect, it } from "vitest";
import { IngestLeadSchema } from "@/src/schemas/lead-ingest.schema";

describe("IngestLeadSchema", () => {
  it("aceita só a pessoa (oportunidade opcional)", () => {
    const parsed = IngestLeadSchema.safeParse({
      person: { name: "Ana", emails: ["ana@acme.com"] },
    });
    expect(parsed.success).toBe(true);
  });

  it("aceita pessoa + oportunidade sem nome (herda no service)", () => {
    const parsed = IngestLeadSchema.safeParse({
      person: { name: "Ana" },
      opportunity: { amount: 1000, stage: "NEW" },
    });
    expect(parsed.success).toBe(true);
  });

  it("não aceita pointOfContactId na oportunidade do lead", () => {
    const parsed = IngestLeadSchema.safeParse({
      person: { name: "Ana" },
      opportunity: { name: "Deal", pointOfContactId: "x" },
    });
    // omit() apenas descarta a chave — o parse continua válido sem ela.
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(
        (parsed.data.opportunity as Record<string, unknown>).pointOfContactId,
      ).toBeUndefined();
    }
  });

  it("rejeita pessoa sem nome", () => {
    expect(
      IngestLeadSchema.safeParse({ person: { emails: ["a@b.com"] } }).success,
    ).toBe(false);
  });
});
