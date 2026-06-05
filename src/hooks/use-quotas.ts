"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type { CreateQuotaInput, QuotaDTO } from "@/src/schemas/quota.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string): string {
  return apiUrl(`/api/workspaces/${slug}/quotas`);
}

/** Metas (quotas) do workspace, com refetch manual. */
export function useQuotas(slug: string) {
  const [quotas, setQuotas] = useState<QuotaDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(baseUrl(slug));
      const json = (await res.json()) as ApiResponse<QuotaDTO[]>;
      setQuotas(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setQuotas([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { quotas, isLoading, refetch };
}

/** Define (cria ou atualiza) a meta de um responsável num período. */
export async function setQuota(
  slug: string,
  input: CreateQuotaInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(baseUrl(slug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<QuotaDTO>;
  return { ok: res.ok && json.success, message: json.message };
}
