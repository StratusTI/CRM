import { describe, expect, it } from "vitest";
import { SendAiMessageSchema } from "@/src/schemas/ai-assistant.schema";

describe("SendAiMessageSchema", () => {
  it("aceita mensagem sem conversa (primeira mensagem)", () => {
    expect(SendAiMessageSchema.safeParse({ message: "Olá" }).success).toBe(
      true,
    );
  });

  it("aceita mensagem com conversationId", () => {
    const parsed = SendAiMessageSchema.safeParse({
      conversationId: "ckxyz123",
      message: "  quantas empresas eu tenho?  ",
    });
    expect(parsed.success).toBe(true);
    // trim aplicado
    expect(parsed.success && parsed.data.message).toBe(
      "quantas empresas eu tenho?",
    );
  });

  it("rejeita mensagem vazia", () => {
    expect(SendAiMessageSchema.safeParse({ message: "   " }).success).toBe(
      false,
    );
  });

  it("rejeita mensagem acima do limite", () => {
    const long = "a".repeat(4001);
    expect(SendAiMessageSchema.safeParse({ message: long }).success).toBe(
      false,
    );
  });
});
