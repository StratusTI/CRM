import type { Product } from "@prisma/client";
import { productNotFound, productSkuTaken } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toProductDTO } from "@/src/mappers/product.mapper";
import {
  ProductRepository,
  type UpdateProductData,
} from "@/src/repositories/product.repository";
import type {
  CreateProductInput,
  ProductDTO,
  UpdateProductInput,
} from "@/src/schemas/product.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Product>> {
  const found = await ProductRepository.findById(id);
  if (!found.ok) return found;
  const product = found.value;
  if (!product || product.workspaceId !== workspaceId || product.deletedAt) {
    return err(productNotFound());
  }
  return ok(product);
}

export const ProductService = {
  async create(
    userId: string,
    slug: string,
    input: CreateProductInput,
  ): Promise<Result<ProductDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "products",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    if (input.sku) {
      const taken = await ProductRepository.existsBySku(ws.value, input.sku);
      if (!taken.ok) return taken;
      if (taken.value) return err(productSkuTaken());
    }

    const created = await ProductRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      sku: input.sku ?? null,
      description: input.description ?? null,
      unitPrice: input.unitPrice,
      currency: input.currency,
      billingType: input.billingType,
      active: input.active,
    });
    if (!created.ok) return created;
    return ok(toProductDTO(created.value));
  },

  async list(userId: string, slug: string): Promise<Result<ProductDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "products",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const result = await ProductRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toProductDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ProductDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "products",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const product = await loadInWorkspace(ws.value, id);
    if (!product.ok) return product;
    return ok(toProductDTO(product.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateProductInput,
  ): Promise<Result<ProductDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "products",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    if (input.sku) {
      const taken = await ProductRepository.existsBySku(
        ws.value,
        input.sku,
        id,
      );
      if (!taken.ok) return taken;
      if (taken.value) return err(productSkuTaken());
    }

    const data: UpdateProductData = { updatedById: userId, ...input };
    const updated = await ProductRepository.update(id, data);
    if (!updated.ok) return updated;
    return ok(toProductDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ProductDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "products",
      action: "DELETE",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await ProductRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toProductDTO(removed.value));
  },

  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "products",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    return ProductRepository.reorder(ws.value, ids);
  },
};
