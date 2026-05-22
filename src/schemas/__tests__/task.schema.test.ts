import { describe, expect, it } from "vitest";
import { CreateTaskSchema, UpdateTaskSchema } from "@/src/schemas/task.schema";

describe("CreateTaskSchema", () => {
  it("aceita apenas o título e usa status TODO por padrão", () => {
    const result = CreateTaskSchema.safeParse({ title: "Ligar" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("TODO");
  });

  it("rejeita título vazio", () => {
    expect(CreateTaskSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejeita status inválido", () => {
    expect(
      CreateTaskSchema.safeParse({ title: "X", status: "WIP" }).success,
    ).toBe(false);
  });

  it("rejeita dueDate não-ISO", () => {
    expect(
      CreateTaskSchema.safeParse({ title: "X", dueDate: "hoje" }).success,
    ).toBe(false);
  });
});

describe("UpdateTaskSchema", () => {
  it("aceita atualização parcial de status", () => {
    expect(UpdateTaskSchema.safeParse({ status: "DONE" }).success).toBe(true);
  });

  it("rejeita payload vazio", () => {
    expect(UpdateTaskSchema.safeParse({}).success).toBe(false);
  });
});
