"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  PublishVideoResult,
  YoutubeChannelOverview,
  YoutubeInsights,
  YoutubeInsightsRange,
} from "@/src/schemas/youtube.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string };
};

/** Erro normalizado das chamadas YouTube (código de domínio + mensagem). */
export type YoutubeError = { code?: string; message: string };

const BASE = (slug: string) => `/api/workspaces/${slug}/social/youtube`;

async function getJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: YoutubeError }> {
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
 * Dados do YouTube para o workspace: overview do canal + analytics (com janela
 * selecionável) + ação de publicar. Segue o padrão fetch/useState das demais
 * features (sem SWR). A janela de analytics dispara um refetch ao mudar.
 */
export function useYoutube(slug: string) {
  const [overview, setOverview] = useState<YoutubeChannelOverview | null>(null);
  const [insights, setInsights] = useState<YoutubeInsights | null>(null);
  const [range, setRange] = useState<YoutubeInsightsRange>("28d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<YoutubeError | null>(null);

  const load = useCallback(
    async (selectedRange: YoutubeInsightsRange) => {
      setIsLoading(true);
      setError(null);
      const [ov, ins] = await Promise.all([
        getJson<YoutubeChannelOverview>(`${BASE(slug)}/overview`),
        getJson<YoutubeInsights>(
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
      // Analytics pode falhar isoladamente (API não habilitada) sem derrubar a
      // página inteira — guardamos o erro mas mantemos o overview visível.
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
      | { ok: true; video: PublishVideoResult }
      | { ok: false; error: YoutubeError }
    > => {
      try {
        const response = await fetch(`${BASE(slug)}/publish`, {
          method: "POST",
          body: form,
        });
        const json = (await response.json()) as ApiResponse<PublishVideoResult>;
        if (!response.ok || !json.success || !json.data) {
          return {
            ok: false,
            error: {
              code: json.error?.code,
              message: json.message ?? "Falha ao publicar o vídeo.",
            },
          };
        }
        return { ok: true, video: json.data };
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
    insights,
    range,
    setRange,
    isLoading,
    error,
    refetch: () => load(range),
    publish,
  };
}
