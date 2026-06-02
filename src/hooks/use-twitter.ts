"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  PublishTweetResult,
  TwitterProfileOverview,
  TwitterTweets,
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
 * Dados do Twitter/X para o workspace: overview do perfil + tweets recentes
 * (best-effort, depende do tier da API) + publicar tweet.
 */
export function useTwitter(slug: string) {
  const [overview, setOverview] = useState<TwitterProfileOverview | null>(null);
  const [tweets, setTweets] = useState<TwitterTweets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<TwitterError | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [ov, tw] = await Promise.all([
      getJson<TwitterProfileOverview>(`${BASE(slug)}/overview`),
      getJson<TwitterTweets>(`${BASE(slug)}/videos`),
    ]);

    if (!ov.ok) {
      setError(ov.error);
      setOverview(null);
      setTweets(null);
      setIsLoading(false);
      return;
    }
    setOverview(ov.data);
    // Tweets são best-effort: falha de tier/escopo não derruba a página.
    setTweets(tw.ok ? tw.data : null);
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

  return { overview, tweets, isLoading, error, refetch: load, publish };
}
