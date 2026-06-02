-- CreateEnum
CREATE TYPE "ScheduledPostStatus" AS ENUM ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ScheduledPostTargetStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ScheduledMediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "title" TEXT,
    "options" JSONB,
    "status" "ScheduledPostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "last_error" TEXT,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_post_targets" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "status" "ScheduledPostTargetStatus" NOT NULL DEFAULT 'PENDING',
    "external_post_id" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_post_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_post_media" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "kind" "ScheduledMediaKind" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_post_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_posts_workspace_id_idx" ON "scheduled_posts"("workspace_id");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_scheduled_for_idx" ON "scheduled_posts"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "scheduled_post_targets_post_id_idx" ON "scheduled_post_targets"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_post_targets_post_id_platform_key" ON "scheduled_post_targets"("post_id", "platform");

-- CreateIndex
CREATE INDEX "scheduled_post_media_post_id_idx" ON "scheduled_post_media"("post_id");

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_post_targets" ADD CONSTRAINT "scheduled_post_targets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "scheduled_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_post_media" ADD CONSTRAINT "scheduled_post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "scheduled_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
