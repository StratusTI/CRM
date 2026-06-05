import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { AiUsageRepository } from "@/src/repositories/ai-usage.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  const { prisma } = await import("@/src/lib/prisma");
  const conversation = await prisma.aiConversation.create({
    data: { workspaceId: workspace.id, userId: owner.id, title: "C" },
  });
  return { owner, workspace, conversation };
}

describe("AiUsageRepository (integração)", () => {
  it("create registra consumo de tokens", async () => {
    const { workspace, conversation } = await scope();
    const result = await AiUsageRepository.create({
      workspaceId: workspace.id,
      conversationId: conversation.id,
      inputTokens: 100,
      outputTokens: 50,
      model: "claude",
    });
    expect(result.ok).toBe(true);
  });

  it("getSummary agrega totais, mês corrente e série diária", async () => {
    const { workspace, conversation } = await scope();
    await AiUsageRepository.create({
      workspaceId: workspace.id,
      conversationId: conversation.id,
      inputTokens: 100,
      outputTokens: 40,
      model: "claude",
    });
    await AiUsageRepository.create({
      workspaceId: workspace.id,
      conversationId: conversation.id,
      inputTokens: 200,
      outputTokens: 60,
      model: "claude",
    });

    const summary = await AiUsageRepository.getSummary(workspace.id);
    expect(summary.ok).toBe(true);
    if (summary.ok) {
      expect(summary.value.totalInputTokens).toBe(300);
      expect(summary.value.totalOutputTokens).toBe(100);
      expect(summary.value.currentMonthInputTokens).toBe(300);
      expect(summary.value.usageByDay.length).toBeGreaterThanOrEqual(1);
      const today = new Date().toISOString().slice(0, 10);
      const todayRow = summary.value.usageByDay.find((d) => d.date === today);
      expect(todayRow?.inputTokens).toBe(300);
    }
  });

  it("getSummary zera quando workspace não tem uso", async () => {
    const { workspace } = await scope();
    const summary = await AiUsageRepository.getSummary(workspace.id);
    expect(summary.ok).toBe(true);
    if (summary.ok) {
      expect(summary.value.totalInputTokens).toBe(0);
      expect(summary.value.usageByDay).toEqual([]);
    }
  });
});
