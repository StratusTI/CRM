import type { AiConversation, AiMessage } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  toAiConversationDTO,
  toAiMessageDTO,
} from "@/src/mappers/ai-assistant.mapper";

const D = new Date("2026-01-01T00:00:00.000Z");

function message(overrides: Partial<AiMessage> = {}): AiMessage {
  return {
    id: "msg1",
    conversationId: "c1",
    role: "USER",
    content: "oi",
    createdAt: D,
    ...overrides,
  } as AiMessage;
}

const conversation: AiConversation = {
  id: "c1",
  title: "Conversa",
  workspaceId: "w1",
  userId: "u1",
  createdAt: D,
  updatedAt: D,
} as AiConversation;

describe("toAiMessageDTO", () => {
  it("normaliza role ASSISTANT → assistant", () => {
    expect(toAiMessageDTO(message({ role: "ASSISTANT" })).role).toBe(
      "assistant",
    );
  });
  it("normaliza role USER → user", () => {
    expect(toAiMessageDTO(message()).role).toBe("user");
  });
});

describe("toAiConversationDTO", () => {
  it("omite messages quando ausentes", () => {
    const dto = toAiConversationDTO(conversation);
    expect(dto.messages).toBeUndefined();
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("inclui messages mapeadas quando presentes", () => {
    const dto = toAiConversationDTO({
      ...conversation,
      messages: [message({ role: "ASSISTANT" })],
    });
    expect(dto.messages).toHaveLength(1);
    expect(dto.messages?.[0].role).toBe("assistant");
  });
});
