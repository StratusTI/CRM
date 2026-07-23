-- CreateTable
CREATE TABLE "hook_vault_items" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "platform" "SocialPlatform",
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hook_vault_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_competitors" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "profile_url" TEXT,
    "followers_count" INTEGER,
    "notes" TEXT,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tracked_competitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hook_vault_items_workspace_id_idx" ON "hook_vault_items"("workspace_id");

-- CreateIndex
CREATE INDEX "hook_vault_items_deleted_at_idx" ON "hook_vault_items"("deleted_at");

-- CreateIndex
CREATE INDEX "hook_vault_items_workspace_id_position_idx" ON "hook_vault_items"("workspace_id", "position");

-- CreateIndex
CREATE INDEX "tracked_competitors_workspace_id_idx" ON "tracked_competitors"("workspace_id");

-- CreateIndex
CREATE INDEX "tracked_competitors_deleted_at_idx" ON "tracked_competitors"("deleted_at");

-- CreateIndex
CREATE INDEX "tracked_competitors_workspace_id_position_idx" ON "tracked_competitors"("workspace_id", "position");

-- AddForeignKey
ALTER TABLE "hook_vault_items" ADD CONSTRAINT "hook_vault_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hook_vault_items" ADD CONSTRAINT "hook_vault_items_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hook_vault_items" ADD CONSTRAINT "hook_vault_items_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_competitors" ADD CONSTRAINT "tracked_competitors_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_competitors" ADD CONSTRAINT "tracked_competitors_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_competitors" ADD CONSTRAINT "tracked_competitors_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
