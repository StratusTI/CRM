"use client";

import { apiUrl } from "@/lib/api-url";

type ApiResponse = { success: boolean; message?: string };

/** Baixa os dados pessoais do titular (portabilidade LGPD) como arquivo JSON. */
export async function downloadMyData(): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(apiUrl("/api/users/me/export"));
    if (!res.ok) return { ok: false };
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meus-dados.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Agenda a exclusão da conta (carência LGPD). Bloqueia se for único dono. */
export async function scheduleAccountDeletion(): Promise<{
  ok: boolean;
  message?: string;
}> {
  const res = await fetch(apiUrl("/api/users/me/deletion"), { method: "POST" });
  const json = (await res.json().catch(() => ({}))) as ApiResponse;
  return { ok: res.ok && json.success !== false, message: json.message };
}

/** Cancela uma exclusão de conta agendada. */
export async function cancelAccountDeletion(): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl("/api/users/me/deletion"), {
    method: "DELETE",
  });
  return { ok: res.ok };
}
