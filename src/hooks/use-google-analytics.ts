"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  GoogleAnalyticsInsights,
  GoogleAnalyticsInsightsRange,
  GoogleAnalyticsOverview,
} from "@/src/schemas/google-analytics.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string };
};

/** Erro normalizado das chamadas do GA (código de domínio + mensagem). */
export type GoogleAnalyticsError = { code?: string; message: string };

const BASE = (slug: string) =>
  `/api/workspaces/${slug}/social/google_analytics`;

async function getJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: GoogleAnalyticsError }> {
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

/**
 * Dados do Google Analytics para o workspace: overview da propriedade GA4
 * conectada + insights (janela selecionável). Read-only — não há publish.
 */
export function useGoogleAnalytics(slug: string) {
  const [overview, setOverview] = useState<GoogleAnalyticsOverview | null>(
    null,
  );
  const [insights, setInsights] = useState<GoogleAnalyticsInsights | null>(
    null,
  );
  const [range, setRange] = useState<GoogleAnalyticsInsightsRange>("28d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<GoogleAnalyticsError | null>(null);

  const load = useCallback(
    async (selectedRange: GoogleAnalyticsInsightsRange) => {
      setIsLoading(true);
      setError(null);
      const [ov, ins] = await Promise.all([
        getJson<GoogleAnalyticsOverview>(`${BASE(slug)}/overview`),
        getJson<GoogleAnalyticsInsights>(
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
