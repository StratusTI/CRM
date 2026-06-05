-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('ONE_TIME', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "billing_type" "BillingType" NOT NULL DEFAULT 'ONE_TIME',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_line_items" (
    "id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "product_id" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "billing_type" "BillingType" NOT NULL DEFAULT 'ONE_TIME',
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_workspace_id_idx" ON "products"("workspace_id");

-- CreateIndex
CREATE INDEX "products_workspace_id_position_idx" ON "products"("workspace_id", "position");

-- CreateIndex
CREATE INDEX "products_deleted_at_idx" ON "products"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_workspace_id_sku_key" ON "products"("workspace_id", "sku");

-- CreateIndex
CREATE INDEX "opportunity_line_items_opportunity_id_idx" ON "opportunity_line_items"("opportunity_id");

-- CreateIndex
CREATE INDEX "opportunity_line_items_opportunity_id_position_idx" ON "opportunity_line_items"("opportunity_id", "position");

-- CreateIndex
CREATE INDEX "opportunity_line_items_product_id_idx" ON "opportunity_line_items"("product_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_line_items" ADD CONSTRAINT "opportunity_line_items_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_line_items" ADD CONSTRAINT "opportunity_line_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
