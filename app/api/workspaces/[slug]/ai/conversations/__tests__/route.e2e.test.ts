import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";
import { AiAssistantRepository } from "@/src/repositories/ai-assistant.repository";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import {
  DELETE,
  GET as GET_ONE,
} from "@/app/api/workspaces/[slug]/ai/conversations/[id]/route";
import { GET as GET_LIST } from "@/app/api/workspaces/[slug]/ai/conversations/route";

function ctxList(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function ctxOne(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function listReq() {
  return new NextRequest(
    "http://localhost/api/workspaces/acme/ai/conversations",
  );
}

async function memberWorkspace() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  return { user, workspace };
}

async function seedConversation(workspaceId: string, userId: string) {
  const created = await AiAssistantRepository.createConversation(
    workspaceId,
    userId,
    "Pergunta inicial",
  );
  if (!created.ok) throw new Error("falha ao semear conversa");
  await AiAssistantRepository.appendMessage({
    conversationId: created.value.id,
    role: "USER",
    content: "quantas empresas eu tenho?",
  });
  await AiAssistantRepository.appendMessage({
    conversationId: created.value.id,
    role: "ASSISTANT",
    content: "Você tem 3 empresas.",
  });
  return created.value;
}

describe("/api/workspaces/[slug]/ai/conversations (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await GET_LIST(listReq(), ctxList("acme"));
    expect(res.status).toBe(401);
  });

  it("lista as conversas do usuário no workspace", async () => {
    const { user, workspace } = await memberWorkspace();
    await seedConversation(workspace.id, user.id);
    asUser(user.id);

    const res = await GET_LIST(listReq(), ctxList(workspace.slug));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe("Pergunta inicial");
    expect(json.data[0].messages).toBeUndefined();
  });

  it("GET por id traz as mensagens em ordem", async () => {
    const { user, workspace } = await memberWorkspace();
    const conv = await seedConversation(workspace.id, user.id);
    asUser(user.id);

    const res = await GET_ONE(listReq(), ctxOne(workspace.slug, conv.id));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.messages).toHaveLength(2);
    expect(json.data.messages[0].role).toBe("user");
    expect(json.data.messages[1].role).toBe("assistant");
  });

  it("404 para conversa de outro usuário", async () => {
    const { user, workspace } = await memberWorkspace();
    const other = await createUser();
    const conv = await seedConversation(workspace.id, other.id);
    asUser(user.id);

    const res = await GET_ONE(listReq(), ctxOne(workspace.slug, conv.id));
    expect(res.status).toBe(404);
  });

  it("DELETE faz soft-delete e some da listagem", async () => {
    const { user, workspace } = await memberWorkspace();
    const conv = await seedConversation(workspace.id, user.id);
    asUser(user.id);

    const del = await DELETE(listReq(), ctxOne(workspace.slug, conv.id));
    expect(del.status).toBe(200);

    const res = await GET_LIST(listReq(), ctxList(workspace.slug));
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });
});
