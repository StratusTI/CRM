"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  CreateDocumentTemplateInput,
  DocumentTemplateDTO,
} from "@/src/schemas/document-template.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string): string {
  return apiUrl(`/api/workspaces/${slug}/document-templates`);
}

/** Lista os templates de documento do workspace, com refetch manual. */
export function useDocumentTemplates(slug: string) {
  const [templates, setTemplates] = useState<DocumentTemplateDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(baseUrl(slug));
      const json = (await res.json()) as ApiResponse<DocumentTemplateDTO[]>;
      setTemplates(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { templates, isLoading, refetch };
}

/** Cria um template a partir do conteúdo atual de um documento. */
export async function createDocumentTemplate(
  slug: string,
  input: CreateDocumentTemplateInput,
): Promise<DocumentTemplateDTO | null> {
  const res = await fetch(baseUrl(slug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<DocumentTemplateDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}

/** Remove (soft-delete) um template. */
export async function deleteDocumentTemplate(
  slug: string,
  id: string,
): Promise<boolean> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, { method: "DELETE" });
  return res.ok;
}
