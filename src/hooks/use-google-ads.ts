"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  GoogleAdsInsights,
  GoogleAdsInsightsRange,
  GoogleAdsOverview,
} from "@/src/schemas/google-ads.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string };
};

export type GoogleAdsError = { code?: string; message: string };

const BASE = (slug: string) =>
  apiUrl(`/api/workspaces/${slug}/social/google_ads`);

async function getJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: GoogleAdsError }> {
  try {
    const response = await fetch(url);
    const json = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !json.success || json.data === undefined) {
      return {
        ok: false,
        error: {
          code: json.error?.code,
          message: json.message ?? "Não foi possível carregar os dados.",
        },
      };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: { message: "Erro de rede. Tente novamente." } };
  }
}

export function useGoogleAds(slug: string) {
  const [overview, setOverview] = useState<GoogleAdsOverview | null>(null);
  const [insights, setInsights] = useState<GoogleAdsInsights | null>(null);
  const [range, setRange] = useState<GoogleAdsInsightsRange>("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<GoogleAdsError | null>(null);

  const load = useCallback(
    async (selectedRange: GoogleAdsInsightsRange) => {
      setIsLoading(true);
      setError(null);
      const [ov, ins] = await Promise.all([
        getJson<GoogleAdsOverview>(`${BASE(slug)}/overview`),
        getJson<GoogleAdsInsights>(
          `${BASE(slug)}/insights?range=${selectedRange}`,
        ),
      ]);

      if (!ov.ok) {
        setError(ov.error);
        setOverview(null);
        setInsights(null);
        setIsLoading(false);
        return;
      }
      setOverview(ov.data);
      if (ins.ok) setInsights(ins.data);
      else {
        setInsights(null);
        setError(ins.error);
      }
      setIsLoading(false);
    },
    [slug],
  );

  useEffect(() => {
    load(range);
  }, [load, range]);

  return {
    overview,
    insights,
    range,
    setRange,
    isLoading,
    error,
    refetch: () => load(range),
  };
}
