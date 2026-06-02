-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SocialPlatform" ADD VALUE 'GOOGLE_ADS';
ALTER TYPE "SocialPlatform" ADD VALUE 'LINKEDIN';

-- CreateTable
CREATE TABLE "mailing_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mailing_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing_list_members" (
    "id" TEXT NOT NULL,
    "mailing_list_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "person_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailing_list_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mailing_lists_workspace_id_idx" ON "mailing_lists"("workspace_id");

-- CreateIndex
CREATE INDEX "mailing_lists_deleted_at_idx" ON "mailing_lists"("deleted_at");

-- CreateIndex
CREATE INDEX "mailing_list_members_mailing_list_id_idx" ON "mailing_list_members"("mailing_list_id");

-- CreateIndex
CREATE INDEX "mailing_list_members_person_id_idx" ON "mailing_list_members"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "mailing_list_members_mailing_list_id_email_key" ON "mailing_list_members"("mailing_list_id", "email");

-- CreateIndex
CREATE INDEX "ai_usage_workspace_id_idx" ON "ai_usage"("workspace_id");

-- CreateIndex
CREATE INDEX "ai_usage_conversation_id_idx" ON "ai_usage"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_usage_created_at_idx" ON "ai_usage"("created_at");

-- AddForeignKey
ALTER TABLE "mailing_lists" ADD CONSTRAINT "mailing_lists_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_lists" ADD CONSTRAINT "mailing_lists_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_list_members" ADD CONSTRAINT "mailing_list_members_mailing_list_id_fkey" FOREIGN KEY ("mailing_list_id") REFERENCES "mailing_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
