"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  CreateEmailCampaignInput,
  EmailCampaignDTO,
  EmailCampaignWithRecipientsDTO,
} from "@/src/schemas/email-campaign.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export function useEmailCampaign(slug: string, id: string) {
  const [campaign, setCampaign] =
    useState<EmailCampaignWithRecipientsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/email-campaigns/${id}`),
      );
      const json =
        (await res.json()) as ApiResponse<EmailCampaignWithRecipientsDTO>;
      if (!res.ok || !json.success || !json.data) {
        setError(json.message ?? "Não foi possível carregar.");
        return;
      }
      setCampaign(json.data);
    } catch {
      setError("Erro de rede.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { campaign, isLoading, error, refetch };
}

export async function createEmailCampaign(
  slug: string,
  input: CreateEmailCampaignInput,
): Promise<{
  ok: boolean;
  data?: EmailCampaignWithRecipientsDTO;
  message?: string;
}> {
  const res = await fetch(apiUrl(`/api/workspaces/${slug}/email-campaigns`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json =
    (await res.json()) as ApiResponse<EmailCampaignWithRecipientsDTO>;
  if (!res.ok || !json.success || !json.data) {
    return { ok: false, message: json.message ?? "Falha ao enviar." };
  }
  return { ok: true, data: json.data };
}

export type ListedCampaign = EmailCampaignDTO;
