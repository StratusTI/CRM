import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { AiAssistantRepository } from "@/src/repositories/ai-assistant.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("AiAssistantRepository (integração)", () => {
  it("cria conversa, anexa mensagens e carrega em ordem", async () => {
    const { owner, workspace } = await scope();
    const created = await AiAssistantRepository.createConversation(
      workspace.id,
      owner.id,
      "Título inicial",
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await AiAssistantRepository.appendMessage({
      conversationId: created.value.id,
      role: "USER",
      content: "oi",
    });
    await AiAssistantRepository.appendMessage({
      conversationId: created.value.id,
      role: "ASSISTANT",
      content: "olá!",
      toolCalls: [{ name: "get_workspace_overview", args: "{}" }],
    });

    const loaded = await AiAssistantRepository.findByIdWithMessages(
      created.value.id,
    );
    expect(loaded.ok).toBe(true);
    if (loaded.ok && loaded.value) {
      expect(loaded.value.messages).toHaveLength(2);
      expect(loaded.value.messages[0].role).toBe("USER");
      expect(loaded.value.messages[1].role).toBe("ASSISTANT");
      expect(loaded.value.messages[1].toolCalls).not.toBeNull();
    }
  });

  it("listByWorkspaceUser ignora deletadas e de outro usuário", async () => {
    const { owner, workspace } = await scope();
    const other = await createUser();

    const keep = await AiAssistantRepository.createConversation(
      workspace.id,
      owner.id,
      "Manter",
    );
    const removed = await AiAssistantRepository.createConversation(
      workspace.id,
      owner.id,
      "Remover",
    );
    await AiAssistantRepository.createConversation(
      workspace.id,
      other.id,
      "De outro usuário",
    );
    if (!keep.ok || !removed.ok) throw new Error("setup falhou");
    await AiAssistantRepository.softDelete(removed.value.id);

    const list = await AiAssistantRepository.listByWorkspaceUser(
      workspace.id,
      owner.id,
    );
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.value).toHaveLength(1);
      expect(list.value[0].id).toBe(keep.value.id);
    }
  });

  it("touch atualiza o título quando informado", async () => {
    const { owner, workspace } = await scope();
    const created = await AiAssistantRepository.createConversation(
      workspace.id,
      owner.id,
      null,
    );
    if (!created.ok) throw new Error("setup falhou");

    const touched = await AiAssistantRepository.touch(
      created.value.id,
      "Novo título",
    );
    expect(touched.ok).toBe(true);
    if (touched.ok) expect(touched.value.title).toBe("Novo título");
  });
});
