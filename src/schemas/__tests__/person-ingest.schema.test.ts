import { describe, expect, it } from "vitest";
import {
  IngestPeopleReportSchema,
  IngestPeopleSchema,
  MAX_INGEST_BATCH,
} from "@/src/schemas/person-ingest.schema";

describe("IngestPeopleSchema", () => {
  it("aceita lote válido", () => {
    const parsed = IngestPeopleSchema.safeParse({
      people: [{ name: "Ana" }, { name: "Beto", emails: ["b@c.com"] }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita lote vazio", () => {
    expect(IngestPeopleSchema.safeParse({ people: [] }).success).toBe(false);
  });

  it(`rejeita acima de ${MAX_INGEST_BATCH}`, () => {
    const people = Array.from({ length: MAX_INGEST_BATCH + 1 }, () => ({
      name: "X",
    }));
    expect(IngestPeopleSchema.safeParse({ people }).success).toBe(false);
  });

  it("rejeita pessoa inválida (sem nome)", () => {
    expect(
      IngestPeopleSchema.safeParse({ people: [{ emails: ["a@b.com"] }] })
        .success,
    ).toBe(false);
  });
});

describe("IngestPeopleReportSchema", () => {
  it("valida relatório com sucesso e falha", () => {
    const parsed = IngestPeopleReportSchema.safeParse({
      total: 2,
      created: 1,
      failed: 1,
      results: [
        { index: 0, status: "created", id: "p_1" },
        {
          index: 1,
          status: "failed",
          error: { code: "X", message: "boom" },
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita resultado com discriminator inválido", () => {
    expect(
      IngestPeopleReportSchema.safeParse({
        total: 1,
        created: 0,
        failed: 0,
        results: [{ index: 0, status: "weird" }],
      }).success,
    ).toBe(false);
  });
});
