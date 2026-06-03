-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PREMISES', 'PORTFOLIO', 'PROPOSAL', 'CONTRACT');

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "type" "DocumentType" NOT NULL DEFAULT 'PROPOSAL';

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "type" "DocumentType" NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_templates_workspace_id_type_idx" ON "document_templates"("workspace_id", "type");

-- CreateIndex
CREATE INDEX "document_templates_deleted_at_idx" ON "document_templates"("deleted_at");

-- CreateIndex
CREATE INDEX "proposals_workspace_id_type_idx" ON "proposals"("workspace_id", "type");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
