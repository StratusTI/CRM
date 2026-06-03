"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  LandingPageDTO,
  LandingPageMetricsDTO,
  UpdateLandingPageInput,
} from "@/src/schemas/landing-page.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string, id: string): string {
  return apiUrl(`/api/workspaces/${slug}/marketing/pages/${id}`);
}

/** Carrega uma landing page, com refetch manual. */
export function useLandingPage(slug: string, id: string) {
  const [page, setPage] = useState<LandingPageDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(baseUrl(slug, id));
      const json = (await res.json()) as ApiResponse<LandingPageDTO>;
      if (!res.ok || !json.success || !json.data) {
        setError(json?.message ?? "Não foi possível carregar a página.");
        return;
      }
      setPage(json.data);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { page, setPage, isLoading, error, refetch };
}

/** PATCH parcial (título, slug, status). */
export async function saveLandingPage(
  slug: string,
  id: string,
  patch: UpdateLandingPageInput,
): Promise<LandingPageDTO | null> {
  const res = await fetch(baseUrl(slug, id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = (await res.json()) as ApiResponse<LandingPageDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}

/** Busca as métricas de acesso agregadas. */
export async function getLandingPageMetrics(
  slug: string,
  id: string,
): Promise<LandingPageMetricsDTO | null> {
  const res = await fetch(`${baseUrl(slug, id)}/metrics`);
  const json = (await res.json()) as ApiResponse<LandingPageMetricsDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}
