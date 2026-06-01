import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createProposal } from "@/src/__tests__/factories/proposal.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ProposalRepository } from "@/src/repositories/proposal.repository";

import { POST } from "@/app/api/p/[token]/view/route";

function viewRequest(token: string, body: unknown, ip = "203.0.113.9") {
  return new NextRequest(`http://localhost/api/p/${token}/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function ctx(token: string) {
  return { params: Promise.resolve({ token }) };
}

async function publishedProposal(token: string) {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return createProposal(workspace.id, owner.id, {
    shareToken: token,
    status: "PUBLISHED",
  });
}

describe("/api/p/[token]/view (e2e)", () => {
  it("registra a visita de uma proposta publicada (202)", async () => {
    const proposal = await publishedProposal("tok-e2e-pub");
    const res = await POST(
      viewRequest("tok-e2e-pub", {
        viewId: "sess-abc-123",
        durationMs: 4200,
        reachedEnd: true,
        scrolledPct: 100,
      }),
      ctx("tok-e2e-pub"),
    );
    expect(res.status).toBe(202);

    const metrics = await ProposalRepository.metricsFor(proposal.id);
    expect(metrics.ok).toBe(true);
    if (metrics.ok) {
      expect(metrics.value.totalViews).toBe(1);
      expect(metrics.value.completed).toBe(1);
    }
  });

  it("404 quando o token não existe", async () => {
    const res = await POST(
      viewRequest("nope", { viewId: "sess-abc-123" }),
      ctx("nope"),
    );
    expect(res.status).toBe(404);
  });

  it("404 quando a proposta está offline (rascunho)", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    await createProposal(workspace.id, owner.id, { shareToken: "tok-draft" });
    const res = await POST(
      viewRequest("tok-draft", { viewId: "sess-abc-123" }),
      ctx("tok-draft"),
    );
    expect(res.status).toBe(404);
  });

  it("422 quando o viewId é inválido", async () => {
    await publishedProposal("tok-e2e-bad");
    const res = await POST(
      viewRequest("tok-e2e-bad", { viewId: "x" }),
      ctx("tok-e2e-bad"),
    );
    expect(res.status).toBe(422);
  });
});
