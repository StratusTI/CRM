import type { BillingType, Product } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateProductData = {
  workspaceId: string;
  createdById: string;
  name: string;
  sku: string | null;
  description: string | null;
  unitPrice: number;
  currency: string;
  billingType: BillingType;
  active: boolean;
};

export type UpdateProductData = {
  updatedById: string;
  name?: string;
  sku?: string | null;
  description?: string | null;
  unitPrice?: number;
  currency?: string;
  billingType?: BillingType;
  active?: boolean;
};

/** Acesso a dados de produto. Sem regra de negócio — só Prisma. */
export const ProductRepository = {
  async create(data: CreateProductData): Promise<Result<Product>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const product = await prisma.product.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(product);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Product | null>> {
    try {
      const product = await prisma.product.findUnique({ where: { id } });
      return ok(product);
    } catch {
      return err(databaseError());
    }
  },

  async existsInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.product.count({
        where: { id, workspaceId, deletedAt: null },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  /** Existe produto não-deletado com este SKU na workspace? (`excludeId` ignora o próprio). */
  async existsBySku(
    workspaceId: string,
    sku: string,
    excludeId?: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.product.count({
        where: {
          workspaceId,
          sku,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(products);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.product.updateMany({
            where: { id, workspaceId, deletedAt: null },
            data: { position: index + 1 },
          }),
        ),
      );
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },

  async update(id: string, data: UpdateProductData): Promise<Result<Product>> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data,
      });
      return ok(product);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Product>> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(product);
    } catch {
      return err(databaseError());
    }
  },
};
