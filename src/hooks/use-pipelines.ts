"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  CreatePipelineInput,
  PipelineDTO,
  UpdatePipelineInput,
} from "@/src/schemas/pipeline.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string): string {
  return apiUrl(`/api/workspaces/${slug}/pipelines`);
}

/** Lista os pipelines do workspace (com etapas), com refetch manual. */
export function usePipelines(slug: string) {
  const [pipelines, setPipelines] = useState<PipelineDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(baseUrl(slug));
      const json = (await res.json()) as ApiResponse<PipelineDTO[]>;
      setPipelines(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setPipelines([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { pipelines, isLoading, refetch };
}

export async function createPipeline(
  slug: string,
  input: CreatePipelineInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(baseUrl(slug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<PipelineDTO>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function updatePipeline(
  slug: string,
  id: string,
  input: UpdatePipelineInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<PipelineDTO>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function deletePipeline(
  slug: string,
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, { method: "DELETE" });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<unknown>;
  return { ok: res.ok, message: json.message };
}
