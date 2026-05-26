"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  UpdateWorkspaceInviteInput,
  WorkspaceInviteDTO,
} from "@/src/schemas/workspace-invite.schema";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

/**
 * Convite por link do workspace (admin). GET cria sob demanda quando ainda
 * não existe; PATCH aplica isActive/role/regenerate.
 */
export function useWorkspaceInvite(slug: string) {
  const [invite, setInvite] = useState<WorkspaceInviteDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${slug}/invite`);
      const json = (await response.json()) as ApiResponse<WorkspaceInviteDTO>;
      if (!response.ok || !json.success || !json.data) {
        setError(json?.message ?? "Não foi possível carregar o convite.");
        return;
      }
      setInvite(json.data);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const update = useCallback(
    async (
      input: UpdateWorkspaceInviteInput,
    ): Promise<{ ok: boolean; message?: string }> => {
      try {
        const response = await fetch(`/api/workspaces/${slug}/invite`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = (await response.json()) as ApiResponse<WorkspaceInviteDTO>;
        if (!response.ok || !json.success || !json.data) {
          return { ok: false, message: json?.message };
        }
        setInvite(json.data);
        return { ok: true };
      } catch {
        return { ok: false, message: "Erro de rede. Tente novamente." };
      }
    },
    [slug],
  );

  return { invite, isLoading, error, refetch, update };
}
