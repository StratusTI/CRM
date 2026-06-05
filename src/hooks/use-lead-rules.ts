"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  CreateRoutingRuleInput,
  CreateScoringRuleInput,
  RoutingRuleDTO,
  ScoringRuleDTO,
} from "@/src/schemas/lead.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

/** Regras de pontuação de leads, com refetch manual. */
export function useScoringRules(slug: string) {
  const [rules, setRules] = useState<ScoringRuleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/lead-scoring-rules`),
      );
      const json = (await res.json()) as ApiResponse<ScoringRuleDTO[]>;
      setRules(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rules, isLoading, refetch };
}

/** Regras de roteamento de leads, com refetch manual. */
export function useRoutingRules(slug: string) {
  const [rules, setRules] = useState<RoutingRuleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/lead-routing-rules`),
      );
      const json = (await res.json()) as ApiResponse<RoutingRuleDTO[]>;
      setRules(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rules, isLoading, refetch };
}

export async function createScoringRule(
  slug: string,
  input: CreateScoringRuleInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(
    apiUrl(`/api/workspaces/${slug}/lead-scoring-rules`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const json = (await res.json()) as ApiResponse<unknown>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function deleteScoringRule(
  slug: string,
  id: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(
    apiUrl(`/api/workspaces/${slug}/lead-scoring-rules/${id}`),
    { method: "DELETE" },
  );
  return { ok: res.ok };
}

export async function createRoutingRule(
  slug: string,
  input: CreateRoutingRuleInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(
    apiUrl(`/api/workspaces/${slug}/lead-routing-rules`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const json = (await res.json()) as ApiResponse<unknown>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function deleteRoutingRule(
  slug: string,
  id: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(
    apiUrl(`/api/workspaces/${slug}/lead-routing-rules/${id}`),
    { method: "DELETE" },
  );
  return { ok: res.ok };
}
