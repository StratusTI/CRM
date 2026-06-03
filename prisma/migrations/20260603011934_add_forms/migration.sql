-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "FormAction" AS ENUM ('COMPANY', 'PERSON', 'LEAD');

-- CreateTable
CREATE TABLE "forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "public_token" TEXT NOT NULL,
    "action" "FormAction" NOT NULL DEFAULT 'LEAD',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "action_config" JSONB NOT NULL DEFAULT '{}',
    "success_message" TEXT,
    "redirect_url" TEXT,
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "action" "FormAction" NOT NULL,
    "created_person_id" TEXT,
    "created_company_id" TEXT,
    "created_opportunity_id" TEXT,
    "person_reused" BOOLEAN NOT NULL DEFAULT false,
    "ip_hash" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "forms_public_token_key" ON "forms"("public_token");

-- CreateIndex
CREATE INDEX "forms_workspace_id_idx" ON "forms"("workspace_id");

-- CreateIndex
CREATE INDEX "forms_status_idx" ON "forms"("status");

-- CreateIndex
CREATE INDEX "forms_deleted_at_idx" ON "forms"("deleted_at");

-- CreateIndex
CREATE INDEX "forms_workspace_id_position_idx" ON "forms"("workspace_id", "position");

-- CreateIndex
CREATE INDEX "form_submissions_form_id_idx" ON "form_submissions"("form_id");

-- CreateIndex
CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions"("created_at");

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
