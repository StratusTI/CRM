"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  UpdateWorkflowDraftInput,
  WorkflowDTO,
  WorkflowRunDTO,
  WorkflowVersionDTO,
} from "@/src/schemas/workflow.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string, id: string): string {
  return apiUrl(`/api/workspaces/${slug}/workflows/${id}`);
}

/** Carrega workflow + draft em paralelo, com refetch manual. */
export function useWorkflow(slug: string, id: string) {
  const [workflow, setWorkflow] = useState<WorkflowDTO | null>(null);
  const [draft, setDraft] = useState<WorkflowVersionDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wfRes, draftRes] = await Promise.all([
        fetch(baseUrl(slug, id)),
        fetch(`${baseUrl(slug, id)}/draft`),
      ]);
      const wfJson = (await wfRes.json()) as ApiResponse<WorkflowDTO>;
      const draftJson =
        (await draftRes.json()) as ApiResponse<WorkflowVersionDTO>;
      if (!wfRes.ok || !wfJson.success || !wfJson.data) {
        setError(wfJson?.message ?? "Não foi possível carregar o workflow.");
        return;
      }
      if (!draftRes.ok || !draftJson.success || !draftJson.data) {
        setError(draftJson?.message ?? "Não foi possível carregar o draft.");
        return;
      }
      setWorkflow(wfJson.data);
      setDraft(draftJson.data);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { workflow, draft, setDraft, isLoading, error, refetch };
}

export async function saveDraft(
  slug: string,
  id: string,
  input: UpdateWorkflowDraftInput,
): Promise<WorkflowVersionDTO | null> {
  const res = await fetch(`${baseUrl(slug, id)}/draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<WorkflowVersionDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}

export async function activateWorkflow(
  slug: string,
  id: string,
): Promise<WorkflowDTO | null> {
  const res = await fetch(`${baseUrl(slug, id)}/activate`, { method: "POST" });
  const json = (await res.json()) as ApiResponse<WorkflowDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}

export async function discardDraft(
  slug: string,
  id: string,
): Promise<WorkflowVersionDTO | null> {
  const res = await fetch(`${baseUrl(slug, id)}/discard`, { method: "POST" });
  const json = (await res.json()) as ApiResponse<WorkflowVersionDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}

export async function triggerWorkflow(
  slug: string,
  id: string,
  payload: Record<string, unknown> = {},
  test = true,
): Promise<WorkflowRunDTO | null> {
  const res = await fetch(`${baseUrl(slug, id)}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, test }),
  });
  const json = (await res.json()) as ApiResponse<WorkflowRunDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}

export async function listRuns(
  slug: string,
  id: string,
): Promise<WorkflowRunDTO[]> {
  const res = await fetch(`${baseUrl(slug, id)}/runs`);
  const json = (await res.json()) as ApiResponse<WorkflowRunDTO[]>;
  return res.ok && json.success ? (json.data ?? []) : [];
}

export async function getRun(
  slug: string,
  id: string,
  runId: string,
): Promise<WorkflowRunDTO | null> {
  const res = await fetch(`${baseUrl(slug, id)}/runs/${runId}`);
  const json = (await res.json()) as ApiResponse<WorkflowRunDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}

export async function resumeRun(
  slug: string,
  id: string,
  runId: string,
  payload: Record<string, unknown>,
): Promise<WorkflowRunDTO | null> {
  const res = await fetch(`${baseUrl(slug, id)}/runs/${runId}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  const json = (await res.json()) as ApiResponse<WorkflowRunDTO>;
  return res.ok && json.success ? (json.data ?? null) : null;
}
