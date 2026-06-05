import { beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "@/src/lib/result";
import type { PublishablePlatform } from "@/src/schemas/scheduled-post.schema";

const repo = vi.hoisted(() => ({
  create: vi.fn(),
  listByWorkspace: vi.fn(),
  findById: vi.fn(),
  updateStatus: vi.fn(),
  updateTarget: vi.fn(),
  reschedule: vi.fn(),
  cancel: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({ findByUserAndSlug: vi.fn() }));
const prismaMock = vi.hoisted(() => ({
  workspace: { findUnique: vi.fn() },
}));
const storage = vi.hoisted(() => ({
  isStorageConfigured: vi.fn(() => true),
  putObject: vi.fn(),
  getObjectBytes: vi.fn(),
}));
const twitter = vi.hoisted(() => ({ publishTweet: vi.fn() }));
const facebook = vi.hoisted(() => ({ publishPost: vi.fn() }));
const instagram = vi.hoisted(() => ({ publishPost: vi.fn() }));
const linkedin = vi.hoisted(() => ({ publish: vi.fn() }));
const tiktok = vi.hoisted(() => ({ publishVideo: vi.fn() }));
const youtube = vi.hoisted(() => ({ publishVideo: vi.fn() }));

vi.mock("@/src/repositories/scheduled-post.repository", () => ({
  ScheduledPostRepository: repo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/src/lib/storage/s3", () => storage);
vi.mock("@/src/services/twitter.service", () => ({ TwitterService: twitter }));
vi.mock("@/src/services/facebook.service", () => ({
  FacebookService: facebook,
}));
vi.mock("@/src/services/instagram.service", () => ({
  InstagramService: instagram,
}));
vi.mock("@/src/services/linkedin.service", () => ({
  LinkedInService: linkedin,
}));
vi.mock("@/src/services/tiktok.service", () => ({ TiktokService: tiktok }));
vi.mock("@/src/services/youtube.service", () => ({ YoutubeService: youtube }));

import {
  publishScheduledPost,
  ScheduledPostService,
} from "@/src/services/scheduled-post.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

function target(overrides: Record<string, unknown> = {}) {
  return {
    id: "t_1",
    postId: "sp_1",
    platform: "TWITTER",
    status: "PENDING",
    externalPostId: null,
    error: null,
    attempts: 0,
    publishedAt: null,
    createdAt: D,
    updatedAt: D,
    ...overrides,
  };
}

function post(overrides: Record<string, unknown> = {}) {
  return {
    id: "sp_1",
    content: "oi",
    title: null,
    status: "SCHEDULED",
    scheduledFor: D,
    publishedAt: null,
    lastError: null,
    options: {},
    workspaceId: WS,
    createdById: "user_1",
    createdAt: D,
    updatedAt: D,
    targets: [target()],
    media: [],
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(repo)) fn.mockReset();
  memberRepo.findByUserAndSlug.mockReset();
  prismaMock.workspace.findUnique.mockReset();
  storage.isStorageConfigured.mockReset().mockReturnValue(true);
  storage.putObject.mockReset();
  storage.getObjectBytes.mockReset();
  for (const m of [twitter, facebook, instagram, linkedin, tiktok, youtube]) {
    for (const fn of Object.values(m)) fn.mockReset();
  }
});

describe("ScheduledPostService.create", () => {
  const baseInput = {
    platforms: ["TWITTER"] as PublishablePlatform[],
    content: "oi",
    mode: "schedule" as const,
    scheduledFor: new Date(Date.now() + 3600_000).toISOString(),
    options: {},
  };

  it("WORKSPACE_NOT_FOUND para não-membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));
    const result = await ScheduledPostService.create(
      "user_1",
      "acme",
      baseInput,
      [],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
  });

  it("STORAGE_NOT_CONFIGURED quando o armazenamento não está pronto", async () => {
    asMember();
    storage.isStorageConfigured.mockReturnValue(false);
    const result = await ScheduledPostService.create(
      "user_1",
      "acme",
      baseInput,
      [],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("STORAGE_NOT_CONFIGURED");
  });

  it("SCHEDULED_POST_INVALID quando Instagram (FEED) não tem imagem", async () => {
    asMember();
    const result = await ScheduledPostService.create(
      "user_1",
      "acme",
      {
        ...baseInput,
        platforms: ["INSTAGRAM"] as PublishablePlatform[],
        options: {},
      },
      [],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEDULED_POST_INVALID");
  });

  it("modo schedule: sobe mídia ao MinIO e persiste como SCHEDULED", async () => {
    asMember();
    storage.putObject.mockResolvedValue(undefined);
    repo.create.mockResolvedValue(ok(post()));
    const result = await ScheduledPostService.create(
      "user_1",
      "acme",
      baseInput,
      [{ kind: "IMAGE", bytes: new ArrayBuffer(8), contentType: "image/png" }],
    );
    expect(result.ok).toBe(true);
    expect(storage.putObject).toHaveBeenCalledTimes(1);
    const createArgs = repo.create.mock.calls[0][0];
    expect(createArgs.status).toBe("SCHEDULED");
  });

  it("modo now: publica inline e devolve o post recarregado", async () => {
    asMember();
    repo.create.mockResolvedValue(ok(post({ status: "PUBLISHING" })));
    prismaMock.workspace.findUnique.mockResolvedValue({ slug: "acme" });
    repo.updateTarget.mockResolvedValue(ok(target()));
    repo.updateStatus.mockResolvedValue(ok(post()));
    repo.findById.mockResolvedValue(
      ok(
        post({
          status: "PUBLISHED",
          targets: [target({ status: "PUBLISHED" })],
        }),
      ),
    );
    twitter.publishTweet.mockResolvedValue(ok({ tweetId: "tw_1" }));

    const result = await ScheduledPostService.create(
      "user_1",
      "acme",
      { ...baseInput, mode: "now", scheduledFor: undefined },
      [],
    );
    expect(result.ok).toBe(true);
    expect(twitter.publishTweet).toHaveBeenCalled();
  });
});

describe("publishScheduledPost", () => {
  it("FAILED quando a workspace não existe", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(null);
    repo.updateStatus.mockResolvedValue(ok(post()));
    await publishScheduledPost(post() as never);
    expect(repo.updateStatus).toHaveBeenCalledWith(
      "sp_1",
      "FAILED",
      expect.objectContaining({ lastError: expect.any(String) }),
    );
  });

  it("PUBLISHED quando todos os alvos publicam", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ slug: "acme" });
    repo.updateTarget.mockResolvedValue(ok(target()));
    repo.updateStatus.mockResolvedValue(ok(post()));
    twitter.publishTweet.mockResolvedValue(ok({ tweetId: "tw_1" }));

    await publishScheduledPost(post() as never);
    expect(repo.updateStatus).toHaveBeenCalledWith(
      "sp_1",
      "PUBLISHED",
      expect.objectContaining({ lastError: null }),
    );
  });

  it("PARTIALLY_FAILED quando um alvo falha e outro publica", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ slug: "acme" });
    repo.updateTarget.mockResolvedValue(ok(target()));
    repo.updateStatus.mockResolvedValue(ok(post()));
    twitter.publishTweet.mockResolvedValue(ok({ tweetId: "tw_1" }));
    linkedin.publish.mockResolvedValue(
      err({ code: "SOCIAL_SCOPE_MISSING", message: "sem escopo" }),
    );

    await publishScheduledPost(
      post({
        targets: [
          target({ id: "t_1", platform: "TWITTER" }),
          target({ id: "t_2", platform: "LINKEDIN" }),
        ],
      }) as never,
    );
    expect(repo.updateStatus).toHaveBeenCalledWith(
      "sp_1",
      "PARTIALLY_FAILED",
      expect.objectContaining({ lastError: "sem escopo" }),
    );
  });

  it("FAILED quando a mídia não carrega do armazenamento", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ slug: "acme" });
    storage.getObjectBytes.mockRejectedValue(new Error("404"));
    repo.updateStatus.mockResolvedValue(ok(post()));
    await publishScheduledPost(
      post({
        media: [
          {
            id: "m_1",
            kind: "IMAGE",
            storageKey: "k1",
            contentType: "image/png",
            sizeBytes: 1,
            order: 0,
          },
        ],
      }) as never,
    );
    expect(repo.updateStatus).toHaveBeenCalledWith(
      "sp_1",
      "FAILED",
      expect.objectContaining({
        lastError: "Falha ao carregar a mídia do armazenamento",
      }),
    );
  });
});

describe("ScheduledPostService.getById / list", () => {
  it("SCHEDULED_POST_NOT_FOUND para outra workspace", async () => {
    asMember();
    repo.findById.mockResolvedValue(ok(post({ workspaceId: "ws_2" })));
    const result = await ScheduledPostService.getById("user_1", "acme", "sp_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEDULED_POST_NOT_FOUND");
  });

  it("list mapeia os posts da workspace", async () => {
    asMember();
    repo.listByWorkspace.mockResolvedValue(ok([post()]));
    const result = await ScheduledPostService.list("user_1", "acme");
    expect(result.ok && result.value).toHaveLength(1);
  });
});

describe("ScheduledPostService.cancel", () => {
  it("recusa cancelar post já publicado", async () => {
    asMember();
    repo.findById.mockResolvedValue(ok(post({ status: "PUBLISHED" })));
    const result = await ScheduledPostService.cancel("user_1", "acme", "sp_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEDULED_POST_INVALID");
  });

  it("cancela post agendado", async () => {
    asMember();
    repo.findById
      .mockResolvedValueOnce(ok(post({ status: "SCHEDULED" })))
      .mockResolvedValueOnce(ok(post({ status: "CANCELED" })));
    repo.cancel.mockResolvedValue(ok(post()));
    const result = await ScheduledPostService.cancel("user_1", "acme", "sp_1");
    expect(result.ok).toBe(true);
  });
});

describe("ScheduledPostService.reschedule", () => {
  it("recusa reagendar post já publicado", async () => {
    asMember();
    repo.findById.mockResolvedValue(ok(post({ status: "PUBLISHED" })));
    const result = await ScheduledPostService.reschedule(
      "user_1",
      "acme",
      "sp_1",
      new Date(Date.now() + 3600_000),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEDULED_POST_INVALID");
  });

  it("reagenda post agendado", async () => {
    asMember();
    const future = new Date(Date.now() + 3600_000);
    repo.findById
      .mockResolvedValueOnce(ok(post({ status: "SCHEDULED" })))
      .mockResolvedValueOnce(ok(post({ scheduledFor: future })));
    repo.reschedule.mockResolvedValue(ok(post()));
    const result = await ScheduledPostService.reschedule(
      "user_1",
      "acme",
      "sp_1",
      future,
    );
    expect(result.ok).toBe(true);
    expect(repo.reschedule).toHaveBeenCalledWith("sp_1", future);
  });
});
