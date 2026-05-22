-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "people" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "companies_workspace_id_position_idx" ON "companies"("workspace_id", "position");

-- CreateIndex
CREATE INDEX "notes_workspace_id_position_idx" ON "notes"("workspace_id", "position");

-- CreateIndex
CREATE INDEX "opportunities_workspace_id_position_idx" ON "opportunities"("workspace_id", "position");

-- CreateIndex
CREATE INDEX "people_workspace_id_position_idx" ON "people"("workspace_id", "position");

-- CreateIndex
CREATE INDEX "tasks_workspace_id_position_idx" ON "tasks"("workspace_id", "position");
