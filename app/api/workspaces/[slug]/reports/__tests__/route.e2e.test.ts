import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOpportunity } from "@/src/__tests__/factories/opportunity.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET as DATA } from "@/app/api/workspaces/[slug]/reports/[id]/data/route";
import { GET as EXPORT } from "@/app/api/workspaces/[slug]/reports/[id]/export/route";
import { POST as CREATE } from "@/app/api/workspaces/[slug]/reports/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}
function idCtx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}
function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}
function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function getReq(url = "http://localhost/api/x"): NextRequest {
  return new NextRequest(url);
}

describe("/api/workspaces/[slug]/reports (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("cria relatório, processa dados e exporta CSV/Excel", async () => {
    const user = await createUser();
    const workspace = await createWorkspaceWithOwner(user.id);
    await createOpportunity(workspace.id, user.id, {
      name: "Deal A",
      amount: 1000,
      source: "WhatsApp",
    });
    await createOpportunity(workspace.id, user.id, {
      name: "Deal B",
      amount: 500,
      source: "Site",
    });
    asUser(user.id);

    // cria o relatório (oportunidades, colunas name/amount, filtro source=WhatsApp)
    const created = await CREATE(
      postReq({
        name: "Oportunidades WhatsApp",
        source: "opportunities",
        columns: ["name", "amount"],
        filters: [{ field: "source", operator: "equals", value: "WhatsApp" }],
      }),
      ctx(workspace.slug),
    );
    expect(created.status).toBe(201);
    const report = (await created.json()).data;

    // data processado: só a oportunidade do WhatsApp
    const dataRes = await DATA(getReq(), idCtx(workspace.slug, report.id));
    expect(dataRes.status).toBe(200);
    const data = (await dataRes.json()).data;
    expect(data.total).toBe(1);
    expect(data.rows[0]).toMatchObject({
      "opportunities.name": "Deal A",
      "opportunities.amount": 1000,
    });

    // export CSV
    const csvRes = await EXPORT(getReq(), idCtx(workspace.slug, report.id));
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("content-type")).toContain("text/csv");
    const csv = await csvRes.text();
    expect(csv).toContain("Deal A");
    expect(csv).not.toContain("Deal B");

    // export Excel
    const xlsRes = await EXPORT(
      getReq(`http://localhost/api/x?format=xlsx`),
      idCtx(workspace.slug, report.id),
    );
    expect(xlsRes.headers.get("content-type")).toContain("vnd.ms-excel");
    const xls = await xlsRes.text();
    expect(xls).toContain("Excel.Sheet");
  });

  it("agrupa por origem contando oportunidades", async () => {
    const user = await createUser();
    const workspace = await createWorkspaceWithOwner(user.id);
    await createOpportunity(workspace.id, user.id, { source: "WhatsApp" });
    await createOpportunity(workspace.id, user.id, { source: "WhatsApp" });
    await createOpportunity(workspace.id, user.id, { source: "Site" });
    asUser(user.id);

    const created = await CREATE(
      postReq({
        name: "Por origem",
        source: "opportunities",
        columns: ["name"],
        groupBy: "source",
      }),
      ctx(workspace.slug),
    );
    const report = (await created.json()).data;

    const dataRes = await DATA(getReq(), idCtx(workspace.slug, report.id));
    const data = (await dataRes.json()).data;
    expect(data.grouped).toBe(true);
    const wpp = data.rows.find(
      (r: Record<string, unknown>) => r["opportunities.source"] === "WhatsApp",
    );
    expect(wpp.count).toBe(2);
  });
});
