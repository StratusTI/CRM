"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  ProposalDTO,
  ProposalMetricsDTO,
  UpdateProposalInput,
} from "@/src/schemas/proposal.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string, id: string): string {
  return apiUrl(`/api/workspaces/${slug}/proposals/${id}`);
}

/** Carrega uma proposta, com refetch manual. */
export function useProposal(slug: string, id: string) {
  const [proposal, setProposal] = useState<ProposalDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(baseUrl(slug, id));
      const json = (await res.json()) as ApiResponse<ProposalDTO>;
      if (!res.ok || !json.success || !json.data) {
        setError(json?.message ?? "Não foi possível carregar a proposta.");
        return;
      }
      setProposal(json.data);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { proposal, setProposal, isLoading, error, refetch };
}

/** PATCH parcial (autosave de conteúdo/título ou alternância de status). */
export async function saveProposal(
  slug: string,
  id: string,
  patch: UpdateProposalInput,
): Promise<ProposalDTO | null> {
  const res = await fetch(baseUrl(slug, id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = (await res.json()) as ApiResponse<ProposalDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}

/** Busca as métricas de leitura agregadas + lista de visitas. */
export async function getProposalMetrics(
  slug: string,
  id: string,
): Promise<ProposalMetricsDTO | null> {
  const res = await fetch(`${baseUrl(slug, id)}/metrics`);
  const json = (await res.json()) as ApiResponse<ProposalMetricsDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}
