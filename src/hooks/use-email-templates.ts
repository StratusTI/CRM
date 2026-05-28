"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  CreateEmailTemplateInput,
  EmailTemplateDTO,
  UpdateEmailTemplateInput,
} from "@/src/schemas/email-template.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export function useEmailTemplate(slug: string, id: string) {
  const [template, setTemplate] = useState<EmailTemplateDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/email-templates/${id}`),
      );
      const json = (await res.json()) as ApiResponse<EmailTemplateDTO>;
      if (!res.ok || !json.success || !json.data) {
        setError(json.message ?? "Não foi possível carregar.");
        return;
      }
      setTemplate(json.data);
    } catch {
      setError("Erro de rede.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { template, isLoading, error, refetch };
}

export async function createEmailTemplate(
  slug: string,
  input: CreateEmailTemplateInput,
): Promise<{ ok: boolean; data?: EmailTemplateDTO; message?: string }> {
  const res = await fetch(apiUrl(`/api/workspaces/${slug}/email-templates`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<EmailTemplateDTO>;
  if (!res.ok || !json.success || !json.data) {
    return { ok: false, message: json.message ?? "Falha ao criar." };
  }
  return { ok: true, data: json.data };
}

export async function updateEmailTemplate(
  slug: string,
  id: string,
  input: UpdateEmailTemplateInput,
): Promise<{ ok: boolean; data?: EmailTemplateDTO; message?: string }> {
  const res = await fetch(
    apiUrl(`/api/workspaces/${slug}/email-templates/${id}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const json = (await res.json()) as ApiResponse<EmailTemplateDTO>;
  if (!res.ok || !json.success || !json.data) {
    return { ok: false, message: json.message ?? "Falha ao atualizar." };
  }
  return { ok: true, data: json.data };
}

export async function deleteEmailTemplate(
  slug: string,
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(
    apiUrl(`/api/workspaces/${slug}/email-templates/${id}`),
    { method: "DELETE" },
  );
  if (!res.ok) {
    const json = (await res
      .json()
      .catch(() => null)) as ApiResponse<unknown> | null;
    return { ok: false, message: json?.message ?? "Falha ao excluir." };
  }
  return { ok: true };
}
