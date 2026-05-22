import { describe, expect, it } from "vitest";
import { CreateNoteSchema, UpdateNoteSchema } from "@/src/schemas/note.schema";

describe("CreateNoteSchema", () => {
  it("aceita nota com apenas título", () => {
    expect(CreateNoteSchema.safeParse({ title: "Reunião" }).success).toBe(true);
  });

  it("aceita nota com apenas corpo", () => {
    expect(CreateNoteSchema.safeParse({ body: "anotação" }).success).toBe(true);
  });

  it("rejeita nota sem título nem corpo", () => {
    expect(CreateNoteSchema.safeParse({ companyId: "c1" }).success).toBe(false);
  });
});

describe("UpdateNoteSchema", () => {
  it("permite limpar título com null", () => {
    expect(UpdateNoteSchema.safeParse({ title: null }).success).toBe(true);
  });

  it("rejeita payload vazio", () => {
    expect(UpdateNoteSchema.safeParse({}).success).toBe(false);
  });
});
