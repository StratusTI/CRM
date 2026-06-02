"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  FacebookInsights,
  FacebookInsightsRange,
  FacebookPageOverview,
  FacebookPosts,
  PublishPostResult,
} from "@/src/schemas/facebook.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string };
};

/** Erro normalizado das chamadas do Facebook (código de domínio + mensagem). */
export type FacebookError = { code?: string; message: string };

const BASE = (slug: string) =>
  apiUrl(`/api/workspaces/${slug}/social/facebook`);

async function getJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: FacebookError }> {
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
 * Dados do Facebook para o workspace: overview da Página + posts recentes +
 * insights (janela selecionável) + publicar.
 */
export function useFacebook(slug: string) {
  const [overview, setOverview] = useState<FacebookPageOverview | null>(null);
  const [posts, setPosts] = useState<FacebookPosts | null>(null);
  const [insights, setInsights] = useState<FacebookInsights | null>(null);
  const [range, setRange] = useState<FacebookInsightsRange>("28d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FacebookError | null>(null);

  const load = useCallback(
    async (selectedRange: FacebookInsightsRange) => {
      setIsLoading(true);
      setError(null);
      const [ov, pst, ins] = await Promise.all([
        getJson<FacebookPageOverview>(`${BASE(slug)}/overview`),
        getJson<FacebookPosts>(`${BASE(slug)}/videos`),
        getJson<FacebookInsights>(
          `${BASE(slug)}/insights?range=${selectedRange}`,
        ),
      ]);

      if (!ov.ok) {
        setError(ov.error);
        setOverview(null);
        setPosts(null);
        setInsights(null);
        setIsLoading(false);
        return;
      }
      setOverview(ov.data);
      setPosts(pst.ok ? pst.data : null);
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
      | { ok: true; post: PublishPostResult }
      | { ok: false; error: FacebookError }
    > => {
      try {
        const response = await fetch(`${BASE(slug)}/publish`, {
          method: "POST",
          body: form,
        });
        const json = (await response.json()) as ApiResponse<PublishPostResult>;
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
    posts,
    insights,
    range,
    setRange,
    isLoading,
    error,
    refetch: () => load(range),
    publish,
  };
}
