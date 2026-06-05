import type {
  ScheduledPost,
  ScheduledPostMedia,
  ScheduledPostTarget,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  toScheduledPostDTO,
  toScheduledPostMediaDTO,
  toScheduledPostTargetDTO,
} from "@/src/mappers/scheduled-post.mapper";

const D = new Date("2026-01-01T00:00:00.000Z");

const target: ScheduledPostTarget = {
  id: "t1",
  postId: "sp1",
  platform: "TWITTER",
  status: "PENDING",
  externalPostId: null,
  error: null,
  attempts: 0,
  publishedAt: null,
  createdAt: D,
  updatedAt: D,
};

const media: ScheduledPostMedia = {
  id: "m1",
  postId: "sp1",
  kind: "IMAGE",
  storageKey: "key",
  contentType: "image/png",
  sizeBytes: 1024,
  order: 0,
  createdAt: D,
};

const post: ScheduledPost & {
  targets: ScheduledPostTarget[];
  media: ScheduledPostMedia[];
} = {
  id: "sp1",
  content: "oi",
  title: null,
  status: "SCHEDULED",
  scheduledFor: D,
  publishedAt: null,
  lastError: null,
  options: {},
  workspaceId: "w1",
  createdById: "u1",
  createdAt: D,
  updatedAt: D,
  targets: [target],
  media: [media],
};

describe("toScheduledPostTargetDTO", () => {
  it("serializa publishedAt nulo", () => {
    expect(toScheduledPostTargetDTO(target).publishedAt).toBeNull();
  });
  it("serializa publishedAt presente", () => {
    expect(
      toScheduledPostTargetDTO({ ...target, publishedAt: D }).publishedAt,
    ).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("toScheduledPostMediaDTO", () => {
  it("expõe só metadados (sem storageKey)", () => {
    const dto = toScheduledPostMediaDTO(media);
    expect(dto).toEqual({
      id: "m1",
      kind: "IMAGE",
      contentType: "image/png",
      sizeBytes: 1024,
      order: 0,
    });
  });
});

describe("toScheduledPostDTO", () => {
  it("serializa datas e relações", () => {
    const dto = toScheduledPostDTO(post);
    expect(dto.scheduledFor).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.publishedAt).toBeNull();
    expect(dto.targets).toHaveLength(1);
    expect(dto.media).toHaveLength(1);
  });
});
