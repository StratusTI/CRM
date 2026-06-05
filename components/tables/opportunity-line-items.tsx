"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  createLineItem,
  deleteLineItem,
  updateLineItem,
  useLineItems,
} from "@/src/hooks/use-line-items";
import type { Option } from "@/src/hooks/use-workspace-lookups";
import type { LineItemDTO } from "@/src/schemas/opportunity-line-item.schema";

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const NONE = "__none__";

/**
 * Itens de uma oportunidade. Cada mutação chama a API (que recalcula o
 * `amount`) e dá refetch; `onChanged` avisa a tabela para resync do valor.
 */
export function OpportunityLineItems({
  slug,
  opportunityId,
  productOptions,
  onChanged,
}: {
  slug: string;
  opportunityId: string;
  productOptions: Option[];
  onChanged?: () => void;
}) {
  const { items, isLoading, refetch } = useLineItems(slug, opportunityId);
  const [busy, setBusy] = React.useState(false);

  const total = items.reduce((sum, item) => sum + item.total, 0);

  async function afterMutation(result: { ok: boolean; message?: string }) {
    setBusy(false);
    if (!result.ok) {
      toast.error(result.message ?? "Não foi possível salvar o item.");
      return;
    }
    await refetch();
    onChanged?.();
  }

  async function handleAdd() {
    setBusy(true);
    await afterMutation(
      await createLineItem(slug, opportunityId, {
        name: "Novo item",
        quantity: 1,
      }),
    );
  }

  async function handleProduct(item: LineItemDTO, productId: string) {
    setBusy(true);
    // Trocar o produto recria o item com o snapshot do produto escolhido.
    const removed = await deleteLineItem(slug, opportunityId, item.id);
    if (!removed.ok) return afterMutation(removed);
    await afterMutation(
      await createLineItem(slug, opportunityId, {
        productId: productId === NONE ? undefined : productId,
        quantity: item.quantity,
        discountPct: item.discountPct,
      }),
    );
  }

  async function handlePatch(
    item: LineItemDTO,
    patch: Partial<Pick<LineItemDTO, "name" | "quantity" | "unitPrice" | "discountPct">>,
  ) {
    setBusy(true);
    await afterMutation(
      await updateLineItem(slug, opportunityId, item.id, patch),
    );
  }

  async function handleDelete(item: LineItemDTO) {
    setBusy(true);
    await afterMutation(await deleteLineItem(slug, opportunityId, item.id));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Itens</span>
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={busy}>
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Sem itens. O valor da oportunidade é editável manualmente.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border p-2.5"
            >
              <div className="flex items-center gap-2">
                {productOptions.length > 0 ? (
                  <Select
                    value={item.productId ?? NONE}
                    onValueChange={(v) => handleProduct(item, v ?? NONE)}
                  >
                    <SelectTrigger size="sm" className="flex-1">
                      <span className="truncate">{item.name}</span>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value={NONE}>— avulso —</SelectItem>
                      {productOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={item.name}
                    className="h-8 flex-1"
                    onBlur={(e) => {
                      if (e.target.value !== item.name) {
                        handlePatch(item, { name: e.target.value });
                      }
                    }}
                    onChange={() => {}}
                    aria-label="Nome do item"
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(item)}
                  disabled={busy}
                  aria-label="Remover item"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">Qtd</span>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={item.quantity}
                    className="h-8 w-16"
                    onBlur={(e) => {
                      const q = Math.max(1, Number(e.target.value) || 1);
                      if (q !== item.quantity) handlePatch(item, { quantity: q });
                    }}
                    aria-label="Quantidade"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">Preço</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={item.unitPrice}
                    className="h-8 w-24"
                    onBlur={(e) => {
                      const p = Math.max(0, Number(e.target.value) || 0);
                      if (p !== item.unitPrice)
                        handlePatch(item, { unitPrice: p });
                    }}
                    aria-label="Preço unitário"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">Desc%</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={item.discountPct}
                    className="h-8 w-16"
                    onBlur={(e) => {
                      const d = Math.min(
                        100,
                        Math.max(0, Number(e.target.value) || 0),
                      );
                      if (d !== item.discountPct)
                        handlePatch(item, { discountPct: d });
                    }}
                    aria-label="Desconto percentual"
                  />
                </label>
                <span className="ml-auto font-medium tabular-nums">
                  {moneyFmt.format(item.total)}
                </span>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums">
              {moneyFmt.format(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
