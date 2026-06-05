-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" "ActivityAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "company_id" TEXT,
    "person_id" TEXT,
    "opportunity_id" TEXT,
    "changed_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "data" JSONB NOT NULL,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_workspace_id_created_at_idx" ON "activities"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_company_id_created_at_idx" ON "activities"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_person_id_created_at_idx" ON "activities"("person_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_opportunity_id_created_at_idx" ON "activities"("opportunity_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_entity_entity_id_idx" ON "activities"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "activities_actor_user_id_idx" ON "activities"("actor_user_id");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
