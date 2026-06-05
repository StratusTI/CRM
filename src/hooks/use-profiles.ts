"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  CreateProfileInput,
  ProfileDTO,
  UpdateProfileInput,
} from "@/src/schemas/profile.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string): string {
  return apiUrl(`/api/workspaces/${slug}/profiles`);
}

/** Perfis de acesso (RBAC) do workspace, com refetch manual. */
export function useProfiles(slug: string) {
  const [profiles, setProfiles] = useState<ProfileDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(baseUrl(slug));
      const json = (await res.json()) as ApiResponse<ProfileDTO[]>;
      setProfiles(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profiles, isLoading, refetch };
}

export async function createProfile(
  slug: string,
  input: CreateProfileInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(baseUrl(slug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<ProfileDTO>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function updateProfile(
  slug: string,
  id: string,
  input: UpdateProfileInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<ProfileDTO>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function deleteProfile(
  slug: string,
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, { method: "DELETE" });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<unknown>;
  return { ok: res.ok, message: json.message };
}

/** Atribui um perfil a um membro. */
export async function setMemberProfile(
  slug: string,
  userId: string,
  profileId: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(apiUrl(`/api/workspaces/${slug}/members/${userId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId }),
  });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<unknown>;
  return { ok: res.ok, message: json.message };
}
