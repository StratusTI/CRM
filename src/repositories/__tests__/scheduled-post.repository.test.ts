import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import {
  type CreateScheduledPostData,
  ScheduledPostRepository,
} from "@/src/repositories/scheduled-post.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

function postData(
  workspaceId: string,
  createdById: string,
  overrides: Partial<CreateScheduledPostData> = {},
): CreateScheduledPostData {
  return {
    workspaceId,
    createdById,
    content: "oi",
    title: null,
    options: null,
    status: "SCHEDULED",
    scheduledFor: new Date(Date.now() + 3600_000),
    ...overrides,
  };
}

async function createPost(
  workspaceId: string,
  createdById: string,
  overrides: Partial<CreateScheduledPostData> = {},
) {
  const result = await ScheduledPostRepository.create(
    postData(workspaceId, createdById, overrides),
    [{ platform: "TWITTER" }, { platform: "FACEBOOK" }],
    [
      {
        kind: "IMAGE",
        storageKey: "k1",
        contentType: "image/png",
        sizeBytes: 100,
        order: 0,
      },
    ],
  );
  if (!result.ok) throw new Error("setup");
  return result.value;
}

describe("ScheduledPostRepository (integração)", () => {
  it("create persiste post + alvos + mídia em transação", async () => {
    const { owner, workspace } = await scope();
    const post = await createPost(workspace.id, owner.id);
    expect(post.targets).toHaveLength(2);
    expect(post.media).toHaveLength(1);
    expect(post.media[0].storageKey).toBe("k1");
  });

  it("findById e listByWorkspace incluem relações", async () => {
    const { owner, workspace } = await scope();
    const post = await createPost(workspace.id, owner.id);
    const found = await ScheduledPostRepository.findById(post.id);
    expect(found.ok && found.value?.targets).toHaveLength(2);
    const list = await ScheduledPostRepository.listByWorkspace(workspace.id);
    expect(list.ok && list.value).toHaveLength(1);
  });

  it("findDue retorna agendados vencidos", async () => {
    const { owner, workspace } = await scope();
    await createPost(workspace.id, owner.id, {
      scheduledFor: new Date(Date.now() - 1000),
    });
    await createPost(workspace.id, owner.id, {
      scheduledFor: new Date(Date.now() + 3600_000),
    });
    const due = await ScheduledPostRepository.findDue(new Date());
    expect(due.ok && due.value).toHaveLength(1);
  });

  it("claim só vence uma vez (corrida concorrente)", async () => {
    const { owner, workspace } = await scope();
    const post = await createPost(workspace.id, owner.id);
    const first = await ScheduledPostRepository.claim(post.id);
    const second = await ScheduledPostRepository.claim(post.id);
    expect(first.ok && first.value).toBe(true);
    expect(second.ok && second.value).toBe(false);
  });

  it("updateStatus, reschedule e updateTarget", async () => {
    const { owner, workspace } = await scope();
    const post = await createPost(workspace.id, owner.id);
    const published = await ScheduledPostRepository.updateStatus(
      post.id,
      "PUBLISHED",
      { publishedAt: new Date() },
    );
    expect(published.ok && published.value.status).toBe("PUBLISHED");

    const future = new Date(Date.now() + 7200_000);
    const rescheduled = await ScheduledPostRepository.reschedule(
      post.id,
      future,
    );
    expect(rescheduled.ok && rescheduled.value.status).toBe("SCHEDULED");

    const target = post.targets[0];
    const updatedTarget = await ScheduledPostRepository.updateTarget(
      target.id,
      { status: "PUBLISHED", externalPostId: "ext-1" },
    );
    expect(updatedTarget.ok && updatedTarget.value.externalPostId).toBe(
      "ext-1",
    );
  });

  it("cancel marca post e alvos pendentes como CANCELED", async () => {
    const { owner, workspace } = await scope();
    const post = await createPost(workspace.id, owner.id);
    const canceled = await ScheduledPostRepository.cancel(post.id);
    expect(canceled.ok && canceled.value.status).toBe("CANCELED");

    const reloaded = await ScheduledPostRepository.findById(post.id);
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) {
      expect(
        reloaded.value?.targets.every((t) => t.status === "CANCELED"),
      ).toBe(true);
    }
  });
});
