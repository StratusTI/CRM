"use client";

import { apiUrl } from "@/lib/api-url";

type ApiResponse = { success: boolean; message?: string };

/** Converte um lead em Pessoa + Oportunidade. */
export async function convertLead(
  slug: string,
  leadId: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(
    apiUrl(`/api/workspaces/${slug}/leads/${leadId}/convert`),
    { method: "POST" },
  );
  const json = (await res.json().catch(() => ({}))) as ApiResponse;
  return { ok: res.ok && json.success !== false, message: json.message };
}
