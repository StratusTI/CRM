"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type { LinkedInOverview } from "@/src/schemas/linkedin.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string };
};

export type LinkedInError = { code?: string; message: string };

const BASE = (slug: string) =>
  apiUrl(`/api/workspaces/${slug}/social/linkedin`);

async function getJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: LinkedInError }> {
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

async function postForm<T>(
  url: string,
  body: FormData,
): Promise<{ ok: true; data: T } | { ok: false; error: LinkedInError }> {
  try {
    const response = await fetch(url, { method: "POST", body });
    const json = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !json.success || json.data === undefined) {
      return {
        ok: false,
        error: {
          code: json.error?.code,
          message: json.message ?? "Erro ao publicar.",
        },
      };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: { message: "Erro de rede. Tente novamente." } };
  }
}

export function useLinkedIn(slug: string) {
  const [overview, setOverview] = useState<LinkedInOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<LinkedInError | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getJson<LinkedInOverview>(`${BASE(slug)}/overview`);
    if (result.ok) {
      setOverview(result.data);
    } else {
      setError(result.error);
      setOverview(null);
    }
    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const publish = useCallback(
    async (
      text: string,
      image?: File | null,
    ): Promise<{ ok: boolean; error?: LinkedInError }> => {
      setIsPublishing(true);
      const form = new FormData();
      form.append("text", text);
      if (image) form.append("image", image);
      const result = await postForm<{ postUrn: string }>(
        `${BASE(slug)}/publish`,
        form,
      );
      setIsPublishing(false);
      if (result.ok) return { ok: true };
      return { ok: false, error: result.error };
    },
    [slug],
  );

  return {
    overview,
    isLoading,
    isPublishing,
    error,
    publish,
    refetch: load,
  };
}
