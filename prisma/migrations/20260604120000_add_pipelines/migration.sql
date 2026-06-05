-- Substitui o enum fixo `OpportunityStage` por pipelines/etapas configuráveis,
-- preservando as oportunidades existentes num pipeline "Padrão" por workspace.

-- CreateEnum
CREATE TYPE "StageCategory" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "category" "StageCategory" NOT NULL DEFAULT 'OPEN',
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipelines_workspace_id_idx" ON "pipelines"("workspace_id");
CREATE INDEX "pipelines_workspace_id_position_idx" ON "pipelines"("workspace_id", "position");
CREATE INDEX "pipelines_deleted_at_idx" ON "pipelines"("deleted_at");
CREATE INDEX "pipeline_stages_pipeline_id_idx" ON "pipeline_stages"("pipeline_id");
CREATE INDEX "pipeline_stages_pipeline_id_position_idx" ON "pipeline_stages"("pipeline_id", "position");

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- Backfill: pipeline "Padrão" + 7 etapas por workspace, e migração das
-- oportunidades existentes para a etapa equivalente ao antigo enum.
-- ----------------------------------------------------------------------------

-- Colunas novas, temporariamente nullable.
ALTER TABLE "opportunities" ADD COLUMN "pipeline_id" TEXT;
ALTER TABLE "opportunities" ADD COLUMN "stage_id" TEXT;

-- Um pipeline padrão por workspace que tenha ao menos um membro (dono).
INSERT INTO "pipelines" ("id", "workspace_id", "name", "position", "is_default", "created_by_id", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  w."id",
  'Padrão',
  1,
  true,
  COALESCE(
    (SELECT m."user_id" FROM "memberships" m WHERE m."workspace_id" = w."id" AND m."role" = 'OWNER' ORDER BY m."created_at" ASC LIMIT 1),
    (SELECT m."user_id" FROM "memberships" m WHERE m."workspace_id" = w."id" ORDER BY m."created_at" ASC LIMIT 1)
  ),
  NOW(),
  NOW()
FROM "workspaces" w
WHERE EXISTS (SELECT 1 FROM "memberships" m WHERE m."workspace_id" = w."id");

-- 7 etapas por pipeline padrão (espelham o antigo enum, em PT-BR).
INSERT INTO "pipeline_stages" ("id", "pipeline_id", "name", "position", "probability", "category", "color", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  p."id",
  v.name,
  v.position,
  v.probability,
  v.category::"StageCategory",
  v.color,
  NOW(),
  NOW()
FROM "pipelines" p
CROSS JOIN (VALUES
  ('Novo', 1, 10, 'OPEN', '#64748b'),
  ('Qualificado', 2, 25, 'OPEN', '#3b82f6'),
  ('Reunião', 3, 40, 'OPEN', '#6366f1'),
  ('Proposta', 4, 60, 'OPEN', '#f59e0b'),
  ('Negociação', 5, 80, 'OPEN', '#f97316'),
  ('Ganho', 6, 100, 'WON', '#10b981'),
  ('Perdido', 7, 0, 'LOST', '#f43f5e')
) AS v(name, position, probability, category, color)
WHERE p."is_default" = true;

-- Liga cada oportunidade ao pipeline padrão da sua workspace e à etapa
-- correspondente ao valor antigo de `stage`.
UPDATE "opportunities" o
SET
  "pipeline_id" = p."id",
  "stage_id" = s."id"
FROM "pipelines" p
JOIN "pipeline_stages" s ON s."pipeline_id" = p."id"
WHERE p."workspace_id" = o."workspace_id"
  AND p."is_default" = true
  AND s."position" = CASE o."stage"
    WHEN 'NEW' THEN 1
    WHEN 'QUALIFIED' THEN 2
    WHEN 'MEETING' THEN 3
    WHEN 'PROPOSAL' THEN 4
    WHEN 'NEGOTIATION' THEN 5
    WHEN 'WON' THEN 6
    WHEN 'LOST' THEN 7
  END;

-- Agora as colunas são obrigatórias.
ALTER TABLE "opportunities" ALTER COLUMN "pipeline_id" SET NOT NULL;
ALTER TABLE "opportunities" ALTER COLUMN "stage_id" SET NOT NULL;

-- Remove o enum/coluna antigos.
ALTER TABLE "opportunities" DROP COLUMN "stage";
DROP TYPE "OpportunityStage";

-- CreateIndex
CREATE INDEX "opportunities_pipeline_id_idx" ON "opportunities"("pipeline_id");
CREATE INDEX "opportunities_stage_id_idx" ON "opportunities"("stage_id");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
