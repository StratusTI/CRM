"use client";

import { useCallback, useEffect, useState } from "react";
import type { MutationResult } from "@/src/hooks/use-resource-list";
import type {
  CreateWidgetInput,
  DashboardWidgetDTO,
  UpdateWidgetInput,
} from "@/src/schemas/dashboard-widget.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function base(slug: string, dashboardId: string): string {
  return `/api/workspaces/${slug}/dashboards/${dashboardId}/widgets`;
}

/** Lista os widgets de um dashboard, com refetch manual. */
export function useDashboardWidgets(slug: string, dashboardId: string) {
  const [widgets, setWidgets] = useState<DashboardWidgetDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(base(slug, dashboardId));
      const json = (await res.json()) as ApiResponse<DashboardWidgetDTO[]>;
      if (!res.ok || !json.success || !json.data) {
        setError(json?.message ?? "Não foi possível carregar os widgets.");
        return;
      }
      setWidgets(json.data);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, dashboardId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { widgets, setWidgets, isLoading, error, refetch };
}

export async function createWidget(
  slug: string,
  dashboardId: string,
  payload: CreateWidgetInput,
): Promise<MutationResult<DashboardWidgetDTO>> {
  try {
    const res = await fetch(base(slug, dashboardId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { ok: false, message: json?.message ?? "Não foi possível criar." };
    }
    return { ok: true, data: json.data as DashboardWidgetDTO };
  } catch {
    return { ok: false, message: "Erro de rede." };
  }
}

export async function updateWidget(
  slug: string,
  dashboardId: string,
  widgetId: string,
  patch: UpdateWidgetInput,
): Promise<MutationResult<DashboardWidgetDTO>> {
  try {
    const res = await fetch(`${base(slug, dashboardId)}/${widgetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        ok: false,
        message: json?.message ?? "Não foi possível salvar.",
      };
    }
    return { ok: true, data: json.data as DashboardWidgetDTO };
  } catch {
    return { ok: false, message: "Erro de rede." };
  }
}

export async function deleteWidget(
  slug: string,
  dashboardId: string,
  widgetId: string,
): Promise<MutationResult<unknown>> {
  try {
    const res = await fetch(`${base(slug, dashboardId)}/${widgetId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        ok: false,
        message: json?.message ?? "Não foi possível remover.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de rede." };
  }
}

/** Persiste posições/tamanhos após drag/resize. Best-effort. */
export async function applyWidgetLayout(
  slug: string,
  dashboardId: string,
  items: { id: string; x: number; y: number; w: number; h: number }[],
): Promise<void> {
  try {
    await fetch(`${base(slug, dashboardId)}/layout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  } catch {
    // Layout local já aplicado; falha de rede não bloqueia a UI.
  }
}
