"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  PublishTweetResult,
  TwitterProfileOverview,
} from "@/src/schemas/twitter.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string };
};

/** Erro normalizado das chamadas do Twitter/X (código de domínio + mensagem). */
export type TwitterError = { code?: string; message: string };

const BASE = (slug: string) => apiUrl(`/api/workspaces/${slug}/social/twitter`);

async function getJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: TwitterError }> {
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
 * Dados do Twitter/X para o workspace: overview do perfil + publicar tweet. Sem
 * insights/posts recentes (paywall no tier gratuito). Mesmo padrão fetch/useState
 * do [[use-instagram]].
 */
export function useTwitter(slug: string) {
  const [overview, setOverview] = useState<TwitterProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<TwitterError | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const ov = await getJson<TwitterProfileOverview>(`${BASE(slug)}/overview`);
    if (!ov.ok) {
      setError(ov.error);
      setOverview(null);
    } else {
      setOverview(ov.data);
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
      | { ok: true; tweet: PublishTweetResult }
      | { ok: false; error: TwitterError }
    > => {
      try {
        const response = await fetch(`${BASE(slug)}/publish`, {
          method: "POST",
          body: form,
        });
        const json = (await response.json()) as ApiResponse<PublishTweetResult>;
        if (!response.ok || !json.success || !json.data) {
          return {
            ok: false,
            error: {
              code: json.error?.code,
              message: json.message ?? "Falha ao publicar.",
            },
          };
        }
        return { ok: true, tweet: json.data };
      } catch {
        return {
          ok: false,
          error: { message: "Erro de rede. Tente novamente." },
        };
      }
    },
    [slug],
  );

  return { overview, isLoading, error, refetch: load, publish };
}
