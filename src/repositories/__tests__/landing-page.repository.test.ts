import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import {
  type CreateLandingPageData,
  LandingPageRepository,
} from "@/src/repositories/landing-page.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

function pageData(
  workspaceId: string,
  createdById: string,
  overrides: Partial<CreateLandingPageData> = {},
): CreateLandingPageData {
  return {
    workspaceId,
    createdById,
    title: "Landing",
    slug: `slug-${randomUUID().slice(0, 8)}`,
    html: "<html></html>",
    ...overrides,
  };
}

async function createPage(
  workspaceId: string,
  createdById: string,
  overrides: Partial<CreateLandingPageData> = {},
) {
  const result = await LandingPageRepository.create(
    pageData(workspaceId, createdById, overrides),
  );
  if (!result.ok) throw new Error("setup");
  return result.value;
}

describe("LandingPageRepository (integração)", () => {
  it("create + findById", async () => {
    const { owner, workspace } = await scope();
    const page = await createPage(workspace.id, owner.id);
    const found = await LandingPageRepository.findById(page.id);
    expect(found.ok && found.value?.title).toBe("Landing");
  });

  it("slugExists respeita exceptId e soft-delete", async () => {
    const { owner, workspace } = await scope();
    const page = await createPage(workspace.id, owner.id, { slug: "promo" });

    const exists = await LandingPageRepository.slugExists(
      workspace.id,
      "promo",
    );
    expect(exists.ok && exists.value).toBe(true);

    const exceptSelf = await LandingPageRepository.slugExists(
      workspace.id,
      "promo",
      page.id,
    );
    expect(exceptSelf.ok && exceptSelf.value).toBe(false);

    await LandingPageRepository.softDelete(page.id, owner.id);
    const afterDelete = await LandingPageRepository.slugExists(
      workspace.id,
      "promo",
    );
    expect(afterDelete.ok && afterDelete.value).toBe(false);
  });

  it("findPublishedBySlug ignora deletados", async () => {
    const { owner, workspace } = await scope();
    const page = await createPage(workspace.id, owner.id, { slug: "x" });
    const found = await LandingPageRepository.findPublishedBySlug(
      workspace.id,
      "x",
    );
    expect(found.ok && found.value?.id).toBe(page.id);
    await LandingPageRepository.softDelete(page.id, owner.id);
    const gone = await LandingPageRepository.findPublishedBySlug(
      workspace.id,
      "x",
    );
    expect(gone.ok && gone.value).toBeNull();
  });

  it("listByWorkspace traz _count.views e respeita reorder", async () => {
    const { owner, workspace } = await scope();
    const a = await createPage(workspace.id, owner.id);
    const b = await createPage(workspace.id, owner.id);
    await LandingPageRepository.reorder(workspace.id, [b.id, a.id]);
    const list = await LandingPageRepository.listByWorkspace(workspace.id);
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.value).toHaveLength(2);
      expect(list.value[0].id).toBe(b.id);
      expect(list.value[0]._count.views).toBe(0);
    }
  });

  it("recordEvent faz upsert por sessão e metricsFor agrega", async () => {
    const { owner, workspace } = await scope();
    const page = await createPage(workspace.id, owner.id);
    await LandingPageRepository.recordEvent({
      landingPageId: page.id,
      viewId: "sess-1",
      ipHash: "h1",
      durationMs: 1000,
      ctaClicks: 1,
      referrer: "google",
    });
    // beacon seguinte da mesma sessão sobrescreve contadores
    await LandingPageRepository.recordEvent({
      landingPageId: page.id,
      viewId: "sess-1",
      ipHash: "h1",
      durationMs: 5000,
      ctaClicks: 3,
      referrer: "google",
    });
    await LandingPageRepository.recordEvent({
      landingPageId: page.id,
      viewId: "sess-2",
      ipHash: "h2",
      durationMs: 3000,
      ctaClicks: 0,
      referrer: null,
    });

    const metrics = await LandingPageRepository.metricsFor(page.id);
    expect(metrics.ok).toBe(true);
    if (metrics.ok) {
      expect(metrics.value.totalViews).toBe(2);
      expect(metrics.value.avgDurationMs).toBe(4000);
      expect(metrics.value.totalCtaClicks).toBe(3);
      expect(metrics.value.referrers.length).toBeGreaterThanOrEqual(1);
    }

    const wsViews = await LandingPageRepository.listViewsByWorkspace(
      workspace.id,
    );
    expect(wsViews.ok && wsViews.value).toHaveLength(2);
    if (wsViews.ok) expect(wsViews.value[0].landingPage.title).toBe("Landing");
  });

  it("update altera status e chat append/list mantém ordem", async () => {
    const { owner, workspace } = await scope();
    const page = await createPage(workspace.id, owner.id);
    const updated = await LandingPageRepository.update(page.id, {
      updatedById: owner.id,
      status: "PUBLISHED",
      publishedAt: new Date(),
    });
    expect(updated.ok && updated.value.status).toBe("PUBLISHED");

    await LandingPageRepository.appendMessage({
      landingPageId: page.id,
      role: "USER",
      content: "crie uma landing",
    });
    await LandingPageRepository.appendMessage({
      landingPageId: page.id,
      role: "ASSISTANT",
      content: "pronto",
    });
    const messages = await LandingPageRepository.listMessages(page.id);
    expect(messages.ok).toBe(true);
    if (messages.ok) {
      expect(messages.value).toHaveLength(2);
      expect(messages.value[0].role).toBe("USER");
    }
  });
});
