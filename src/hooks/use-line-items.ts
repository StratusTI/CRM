"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  CreateLineItemPayload,
  LineItemDTO,
  UpdateLineItemInput,
} from "@/src/schemas/opportunity-line-item.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string, opportunityId: string): string {
  return apiUrl(
    `/api/workspaces/${slug}/opportunities/${opportunityId}/line-items`,
  );
}

/** Itens (line items) de uma oportunidade, com refetch manual. */
export function useLineItems(slug: string, opportunityId: string) {
  const [items, setItems] = useState<LineItemDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(baseUrl(slug, opportunityId));
      const json = (await res.json()) as ApiResponse<LineItemDTO[]>;
      setItems(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug, opportunityId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, isLoading, refetch };
}

export async function createLineItem(
  slug: string,
  opportunityId: string,
  input: CreateLineItemPayload,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(baseUrl(slug, opportunityId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<LineItemDTO>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function updateLineItem(
  slug: string,
  opportunityId: string,
  itemId: string,
  input: UpdateLineItemInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${baseUrl(slug, opportunityId)}/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<LineItemDTO>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function deleteLineItem(
  slug: string,
  opportunityId: string,
  itemId: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${baseUrl(slug, opportunityId)}/${itemId}`, {
    method: "DELETE",
  });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<unknown>;
  return { ok: res.ok, message: json.message };
}
