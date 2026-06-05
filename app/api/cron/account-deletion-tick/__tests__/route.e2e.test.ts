import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cron/account-deletion-tick/route";
import { createMembership } from "@/src/__tests__/factories/membership.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";

const SECRET = "test-cron-secret-1234567890";

function cronReq(secret = SECRET): NextRequest {
  return new NextRequest("http://localhost/api/cron/account-deletion-tick", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
}

/** Marca a exclusão como vencida (no passado) direto no banco. */
async function setDueYesterday(userId: string) {
  const { prisma } = await import("@/src/lib/prisma");
  await prisma.user.update({
    where: { id: userId },
    data: { deletionScheduledAt: new Date(Date.now() - 24 * 3600 * 1000) },
  });
}

describe("/api/cron/account-deletion-tick (e2e)", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
  });

  it("401 sem o secret correto", async () => {
    const res = await POST(cronReq("errado"));
    expect(res.status).toBe(401);
  });

  it("anonimiza conta vencida e revoga vínculos", async () => {
    const { prisma } = await import("@/src/lib/prisma");
    // owner do workspace dele próprio + segundo membro que será excluído
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    const victim = await createUser({ name: "Alvo", email: "alvo@x.com" });
    await createMembership(workspace.id, victim.id, "MEMBER");
    await setDueYesterday(victim.id);

    const res = await POST(cronReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.anonymized).toBeGreaterThanOrEqual(1);

    const after = await prisma.user.findUnique({ where: { id: victim.id } });
    expect(after?.name).toBe("Usuário removido");
    expect(after?.email).toBe(`deleted-${victim.id}@deleted.invalid`);
    expect(after?.anonymizedAt).not.toBeNull();
    expect(after?.deletionScheduledAt).toBeNull();

    const memberships = await prisma.membership.count({
      where: { userId: victim.id },
    });
    expect(memberships).toBe(0);
  });

  it("não anonimiza único proprietário (pula até transferir)", async () => {
    const { prisma } = await import("@/src/lib/prisma");
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    void workspace;
    await setDueYesterday(owner.id);

    const res = await POST(cronReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.skipped).toBeGreaterThanOrEqual(1);

    const after = await prisma.user.findUnique({ where: { id: owner.id } });
    expect(after?.anonymizedAt).toBeNull(); // preservado
    expect(after?.name).not.toBe("Usuário removido");
  });

  it("é idempotente: já anonimizado não reprocessa", async () => {
    const { prisma } = await import("@/src/lib/prisma");
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    const victim = await createUser();
    await createMembership(workspace.id, victim.id, "MEMBER");
    await setDueYesterday(victim.id);

    await POST(cronReq());
    const second = await POST(cronReq());
    const json = await second.json();
    // o alvo já foi anonimizado; não conta de novo
    expect(json.data.anonymized).toBe(0);

    const after = await prisma.user.findUnique({ where: { id: victim.id } });
    expect(after?.anonymizedAt).not.toBeNull();
  });
});
