"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  CreateReportInput,
  ReportData,
  ReportDTO,
  UpdateReportInput,
} from "@/src/schemas/report.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

function baseUrl(slug: string): string {
  return apiUrl(`/api/workspaces/${slug}/reports`);
}

/** Lista de relatórios do workspace, com refetch manual. */
export function useReports(slug: string) {
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(baseUrl(slug));
      const json = (await res.json()) as ApiResponse<ReportDTO[]>;
      setReports(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { reports, isLoading, refetch };
}

/** Carrega um único relatório (para o builder), com refetch manual. */
export function useReport(slug: string, id: string) {
  const [report, setReport] = useState<ReportDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl(slug)}/${id}`);
      const json = (await res.json()) as ApiResponse<ReportDTO>;
      if (!res.ok || !json.success || !json.data) {
        setError(json?.message ?? "Relatório não encontrado.");
        return;
      }
      setReport(json.data);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { report, isLoading, error, refetch };
}

export async function createReport(
  slug: string,
  input: CreateReportInput,
): Promise<{ ok: boolean; message?: string; data?: ReportDTO }> {
  const res = await fetch(baseUrl(slug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<ReportDTO>;
  return {
    ok: res.ok && json.success,
    message: json.message,
    data: json.data,
  };
}

export async function updateReport(
  slug: string,
  id: string,
  patch: UpdateReportInput,
): Promise<{ ok: boolean; message?: string; data?: ReportDTO }> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = (await res.json()) as ApiResponse<ReportDTO>;
  return {
    ok: res.ok && json.success,
    message: json.message,
    data: json.data,
  };
}

export async function deleteReport(
  slug: string,
  id: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, { method: "DELETE" });
  return { ok: res.ok };
}

/** Busca os dados processados de um relatório (para o preview). */
export async function fetchReportData(
  slug: string,
  id: string,
): Promise<ReportData | null> {
  try {
    const res = await fetch(`${baseUrl(slug)}/${id}/data`);
    const json = (await res.json()) as ApiResponse<ReportData>;
    return res.ok && json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

/** Dispara o download do export (csv|xlsx). */
export function exportReportUrl(
  slug: string,
  id: string,
  format: "csv" | "xlsx",
): string {
  return `${baseUrl(slug)}/${id}/export?format=${format}`;
}
