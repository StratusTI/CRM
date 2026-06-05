"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  ActivityDTO,
  TimelineEntity,
} from "@/src/schemas/activity.schema";

type ApiResponse<T> = { success: boolean; data?: T };

const RESOURCE: Record<TimelineEntity, string> = {
  company: "companies",
  person: "people",
  opportunity: "opportunities",
};

/** Atividades (timeline) de um registro, mais recentes primeiro. */
export function useTimeline(
  slug: string,
  entity: TimelineEntity,
  recordId: string,
) {
  const [items, setItems] = useState<ActivityDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        apiUrl(
          `/api/workspaces/${slug}/${RESOURCE[entity]}/${recordId}/timeline`,
        ),
      );
      const json = (await res.json()) as ApiResponse<ActivityDTO[]>;
      setItems(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug, entity, recordId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, isLoading, refetch };
}
