"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  InstagramInsights,
  InstagramInsightsRange,
  InstagramMediaList,
  InstagramProfileOverview,
  InstagramWeeklyEngagement,
  PublishInstagramPostResult,
} from "@/src/schemas/instagram.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string };
};

/** Erro normalizado das chamadas do Instagram (código de domínio + mensagem). */
export type InstagramError = { code?: string; message: string };

const BASE = (slug: string) =>
  apiUrl(`/api/workspaces/${slug}/social/instagram`);

async function getJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: InstagramError }> {
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
 * Dados do Instagram para o workspace: overview do perfil + mídias recentes +
 * insights (janela selecionável) + publicar.
 */
export function useInstagram(slug: string) {
  const [overview, setOverview] = useState<InstagramProfileOverview | null>(
    null,
  );
  const [media, setMedia] = useState<InstagramMediaList | null>(null);
  const [insights, setInsights] = useState<InstagramInsights | null>(null);
  const [engagement, setEngagement] =
    useState<InstagramWeeklyEngagement | null>(null);
  const [range, setRange] = useState<InstagramInsightsRange>("28d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<InstagramError | null>(null);

  const load = useCallback(
    async (selectedRange: InstagramInsightsRange) => {
      setIsLoading(true);
      setError(null);
      const [ov, med, ins, eng] = await Promise.all([
        getJson<InstagramProfileOverview>(`${BASE(slug)}/overview`),
        getJson<InstagramMediaList>(`${BASE(slug)}/videos`),
        getJson<InstagramInsights>(
          `${BASE(slug)}/insights?range=${selectedRange}`,
        ),
        getJson<InstagramWeeklyEngagement>(`${BASE(slug)}/engagement`),
      ]);

      if (!ov.ok) {
        setError(ov.error);
        setOverview(null);
        setMedia(null);
        setInsights(null);
        setEngagement(null);
        setIsLoading(false);
        return;
      }
      setOverview(ov.data);
      setMedia(med.ok ? med.data : null);
      setEngagement(eng.ok ? eng.data : null);
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

  const publish = useCallback(
    async (
      form: FormData,
    ): Promise<
      | { ok: true; post: PublishInstagramPostResult }
      | { ok: false; error: InstagramError }
    > => {
      try {
        const response = await fetch(`${BASE(slug)}/publish`, {
          method: "POST",
          body: form,
        });
        const json =
          (await response.json()) as ApiResponse<PublishInstagramPostResult>;
        if (!response.ok || !json.success || !json.data) {
          return {
            ok: false,
            error: {
              code: json.error?.code,
              message: json.message ?? "Falha ao publicar.",
            },
          };
        }
        return { ok: true, post: json.data };
      } catch {
        return {
          ok: false,
          error: { message: "Erro de rede. Tente novamente." },
        };
      }
    },
    [slug],
  );

  return {
    overview,
    media,
    insights,
    engagement,
    range,
    setRange,
    isLoading,
    error,
    refetch: () => load(range),
    publish,
  };
}
