"use client";

import { useCallback, useEffect, useState } from "react";
import type { SocialConnectionDTO } from "@/src/schemas/social-connection.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

/**
 * Conexões de rede social do workspace. Lista (GET) + desconectar (DELETE).
 * "Conectar" não fica aqui: é uma navegação do browser para a rota `/connect`
 * (inicia o OAuth no servidor) — ver `SocialConnectionsSection`.
 */
export function useSocialConnections(slug: string) {
  const [connections, setConnections] = useState<SocialConnectionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${slug}/social`);
      const json = (await response.json()) as ApiResponse<
        SocialConnectionDTO[]
      >;
      if (!response.ok || !json.success || !json.data) {
        setError(json?.message ?? "Não foi possível carregar as conexões.");
        return;
      }
      setConnections(json.data);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const disconnect = useCallback(
    async (
      platformSlug: string,
    ): Promise<{ ok: boolean; message?: string }> => {
      try {
        const response = await fetch(
          `/api/workspaces/${slug}/social/${platformSlug}`,
          { method: "DELETE" },
        );
        const json = (await response.json()) as ApiResponse<unknown>;
        if (!response.ok || !json.success) {
          return { ok: false, message: json?.message };
        }
        await refetch();
        return { ok: true };
      } catch {
        return { ok: false, message: "Erro de rede. Tente novamente." };
      }
    },
    [slug, refetch],
  );

  return { connections, isLoading, error, refetch, disconnect };
}
