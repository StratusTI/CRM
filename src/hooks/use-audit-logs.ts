"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type { ActivityDTO } from "@/src/schemas/activity.schema";

type ApiResponse<T> = { success: boolean; data?: T };

export type AuditFilters = {
  entity?: string;
  action?: string;
};

/** Audit log da workspace, com filtros opcionais e refetch manual. */
export function useAuditLogs(slug: string, filters: AuditFilters = {}) {
  const [items, setItems] = useState<ActivityDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const filterKey = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const current = JSON.parse(filterKey) as AuditFilters;
      const params = new URLSearchParams();
      if (current.entity) params.set("entity", current.entity);
      if (current.action) params.set("action", current.action);
      const qs = params.toString();
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/audit-logs${qs ? `?${qs}` : ""}`),
      );
      const json = (await res.json()) as ApiResponse<ActivityDTO[]>;
      setItems(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug, filterKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, isLoading, refetch };
}
