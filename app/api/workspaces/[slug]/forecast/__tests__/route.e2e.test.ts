import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOpportunity } from "@/src/__tests__/factories/opportunity.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET } from "@/app/api/workspaces/[slug]/forecast/route";
import { POST as POST_QUOTA } from "@/app/api/workspaces/[slug]/quotas/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function forecastRequest(slug: string, period: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/workspaces/${slug}/forecast?period=${period}`,
  );
}

function quotaRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x/quotas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function setup() {
  const { prisma } = await import("@/src/lib/prisma");
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  const pipeline = await prisma.pipeline.findFirstOrThrow({
    where: { workspaceId: workspace.id, isDefault: true },
    include: { stages: { orderBy: { position: "asc" } } },
  });
  const open = pipeline.stages.find((s) => s.category === "OPEN");
  const won = pipeline.stages.find((s) => s.category === "WON");
  return { user, slug: workspace.slug, workspace, pipeline, open, won, prisma };
}

describe("/api/workspaces/[slug]/forecast (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("agrega ganho + pipeline ponderado por mês e calcula atingimento", async () => {
    const { user, slug, pipeline, open, won } = await setup();
    if (!open || !won) throw new Error("seed sem etapas OPEN/WON");
    asUser(user.id);

    // Aberta: 1000 × probabilidade(open) — etapa "Novo" tem probability 10.
    await createOpportunity(pipeline.workspaceId, user.id, {
      amount: 1000,
      closeDate: new Date("2026-06-10T00:00:00.000Z"),
      owner: { connect: { id: user.id } },
      pipeline: { connect: { id: pipeline.id } },
      stage: { connect: { id: open.id } },
    });
    // Ganha: 2000 cheios.
    await createOpportunity(pipeline.workspaceId, user.id, {
      amount: 2000,
      closeDate: new Date("2026-06-20T00:00:00.000Z"),
      owner: { connect: { id: user.id } },
      pipeline: { connect: { id: pipeline.id } },
      stage: { connect: { id: won.id } },
    });

    // Meta de 5000 para o mês.
    await POST_QUOTA(
      quotaRequest({
        ownerId: user.id,
        period: "MONTH",
        periodKey: "2026-06",
        targetAmount: 5000,
      }),
      ctx(slug),
    );

    const res = await GET(forecastRequest(slug, "MONTH"), ctx(slug));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.period).toBe("MONTH");

    const row = json.data.rows.find(
      (r: { periodKey: string; ownerId: string }) =>
        r.periodKey === "2026-06" && r.ownerId === user.id,
    );
    expect(row).toBeDefined();
    // ponderado = 1000 × probability(open)/100; forecast = won + ponderado.
    const weighted = (1000 * open.probability) / 100;
    expect(row.weightedOpenAmount).toBe(weighted);
    expect(row.wonAmount).toBe(2000);
    expect(row.forecastAmount).toBe(2000 + weighted);
    expect(row.quotaAmount).toBe(5000);
    expect(row.attainmentPct).toBe(
      Math.round(((2000 + weighted) / 5000) * 100),
    );
  });

  it("default period é MONTH e ignora oportunidades sem closeDate", async () => {
    const { user, slug, pipeline, open } = await setup();
    if (!open) throw new Error("seed sem etapa OPEN");
    asUser(user.id);

    await createOpportunity(pipeline.workspaceId, user.id, {
      amount: 1000,
      owner: { connect: { id: user.id } },
      pipeline: { connect: { id: pipeline.id } },
      stage: { connect: { id: open.id } },
    });

    const res = await GET(
      new NextRequest(`http://localhost/api/workspaces/${slug}/forecast`),
      ctx(slug),
    );
    const json = await res.json();
    expect(json.data.period).toBe("MONTH");
    expect(json.data.rows).toHaveLength(0);
  });
});
