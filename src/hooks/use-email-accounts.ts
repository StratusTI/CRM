"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";

export type EmailAccount = {
  id: string;
  provider: "GOOGLE" | "MICROSOFT";
  email: string;
  lastSyncedAt: string | null;
};

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string): string {
  return apiUrl(`/api/workspaces/${slug}/email-accounts`);
}

/** Contas de e-mail conectadas do usuário, com refetch manual. */
export function useEmailAccounts(slug: string) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(baseUrl(slug));
      const json = (await res.json()) as ApiResponse<EmailAccount[]>;
      setAccounts(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { accounts, isLoading, refetch };
}

/** Inicia o OAuth e redireciona para o consent do provedor. */
export async function connectEmailAccount(
  slug: string,
  provider: "GOOGLE" | "MICROSOFT",
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${baseUrl(slug)}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  const json = (await res.json()) as ApiResponse<{ authorizeUrl: string }>;
  if (res.ok && json.success && json.data?.authorizeUrl) {
    window.location.href = json.data.authorizeUrl;
    return { ok: true };
  }
  return { ok: false, message: json.message };
}

export async function syncEmailAccount(
  slug: string,
  id: string,
): Promise<{ ok: boolean; message?: string; imported?: number }> {
  const res = await fetch(`${baseUrl(slug)}/${id}/sync`, { method: "POST" });
  const json = (await res.json()) as ApiResponse<{ imported: number }>;
  return {
    ok: res.ok && json.success,
    message: json.message,
    imported: json.data?.imported,
  };
}

export async function disconnectEmailAccount(
  slug: string,
  id: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, { method: "DELETE" });
  return { ok: res.ok };
}
