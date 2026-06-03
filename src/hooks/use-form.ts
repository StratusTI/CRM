"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type { FormSubmissionDTO } from "@/src/mappers/form.mapper";
import type { FormDTO, UpdateFormInput } from "@/src/schemas/form.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string, id: string): string {
  return apiUrl(`/api/workspaces/${slug}/forms/${id}`);
}

/** Carrega um formulário, com refetch manual. */
export function useForm(slug: string, id: string) {
  const [form, setForm] = useState<FormDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(baseUrl(slug, id));
      const json = (await res.json()) as ApiResponse<FormDTO>;
      if (!res.ok || !json.success || !json.data) {
        setError(json?.message ?? "Não foi possível carregar o formulário.");
        return;
      }
      setForm(json.data);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { form, setForm, isLoading, error, refetch };
}

/** Carrega as submissões de um formulário (para o painel de estatísticas). */
export function useFormSubmissions(slug: string, id: string, enabled = true) {
  const [submissions, setSubmissions] = useState<FormSubmissionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl(slug, id)}/submissions`);
      const json = (await res.json()) as ApiResponse<FormSubmissionDTO[]>;
      if (!res.ok || !json.success || !json.data) {
        setError(json?.message ?? "Não foi possível carregar as respostas.");
        return;
      }
      setSubmissions(json.data);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    if (enabled) refetch();
  }, [enabled, refetch]);

  return { submissions, isLoading, error, refetch };
}

export type SaveFormResult = { ok: boolean; data?: FormDTO; message?: string };

/** PATCH parcial. Retorna o erro legível do servidor (ex.: publish inválido). */
export async function saveForm(
  slug: string,
  id: string,
  patch: UpdateFormInput,
): Promise<SaveFormResult> {
  try {
    const res = await fetch(baseUrl(slug, id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = (await res.json()) as ApiResponse<FormDTO>;
    if (!res.ok || !json.success) {
      return {
        ok: false,
        message: json?.message ?? "Não foi possível salvar.",
      };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Erro de rede. Tente novamente." };
  }
}
