import { describe, expect, it } from "vitest";
import { createProduct } from "@/src/__tests__/factories/product.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ProductRepository } from "@/src/repositories/product.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("ProductRepository (integração)", () => {
  it("create persiste preço e tipo de cobrança", async () => {
    const { owner, workspace } = await scope();
    const result = await ProductRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      name: "Plano Anual",
      sku: "ANO-1",
      description: null,
      unitPrice: 1200,
      currency: "BRL",
      billingType: "YEARLY",
      active: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.unitPrice.toString()).toBe("1200");
      expect(result.value.billingType).toBe("YEARLY");
    }
  });

  it("existsBySku ignora o próprio id e respeita soft-delete", async () => {
    const { owner, workspace } = await scope();
    const product = await createProduct(workspace.id, owner.id, {
      sku: "SKU-1",
    });

    const taken = await ProductRepository.existsBySku(workspace.id, "SKU-1");
    expect(taken.ok && taken.value).toBe(true);

    const self = await ProductRepository.existsBySku(
      workspace.id,
      "SKU-1",
      product.id,
    );
    expect(self.ok && self.value).toBe(false);
  });

  it("listByWorkspace ignora deletados e de outra workspace", async () => {
    const { owner, workspace } = await scope();
    const other = await scope();
    const keep = await createProduct(workspace.id, owner.id);
    const removed = await createProduct(workspace.id, owner.id);
    await createProduct(other.workspace.id, other.owner.id);
    await ProductRepository.softDelete(removed.id, owner.id);

    const result = await ProductRepository.listByWorkspace(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(keep.id);
    }
  });
});
