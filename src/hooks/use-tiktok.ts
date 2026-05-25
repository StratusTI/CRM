"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  PublishTiktokVideoResult,
  TiktokCreatorOverview,
  TiktokVideos,
} from "@/src/schemas/tiktok.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string };
};

/** Erro normalizado das chamadas do TikTok (código de domínio + mensagem). */
export type TiktokError = { code?: string; message: string };

const BASE = (slug: string) => `/api/workspaces/${slug}/social/tiktok`;

async function getJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: TiktokError }> {
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
 * Dados do TikTok para o workspace: overview do criador + vídeos recentes +
 * publicar. Mesmo padrão fetch/useState do [[use-facebook]] e [[use-youtube]],
 * mas sem janela de tempo (a Display API não expõe série temporal).
 */
export function useTiktok(slug: string) {
  const [overview, setOverview] = useState<TiktokCreatorOverview | null>(null);
  const [videos, setVideos] = useState<TiktokVideos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<TiktokError | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [ov, vid] = await Promise.all([
      getJson<TiktokCreatorOverview>(`${BASE(slug)}/overview`),
      getJson<TiktokVideos>(`${BASE(slug)}/videos`),
    ]);

    if (!ov.ok) {
      setError(ov.error);
      setOverview(null);
      setVideos(null);
      setIsLoading(false);
      return;
    }
    setOverview(ov.data);
    if (vid.ok) setVideos(vid.data);
    else {
      setVideos(null);
      setError(vid.error);
    }
    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const publish = useCallback(
    async (
      form: FormData,
    ): Promise<
      | { ok: true; result: PublishTiktokVideoResult }
      | { ok: false; error: TiktokError }
    > => {
      try {
        const response = await fetch(`${BASE(slug)}/publish`, {
          method: "POST",
          body: form,
        });
        const json =
          (await response.json()) as ApiResponse<PublishTiktokVideoResult>;
        if (!response.ok || !json.success || !json.data) {
          return {
            ok: false,
            error: {
              code: json.error?.code,
              message: json.message ?? "Falha ao publicar.",
            },
          };
        }
        return { ok: true, result: json.data };
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
    videos,
    isLoading,
    error,
    refetch: load,
    publish,
  };
}
