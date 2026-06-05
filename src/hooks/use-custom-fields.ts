"use client";

import { useCallback, useEffect, useState } from "react";
import type { GridColumn } from "@/components/tables/grid";
import { apiUrl } from "@/lib/api-url";
import type {
  CreateCustomFieldInput,
  CustomFieldDTO,
  UpdateCustomFieldInput,
} from "@/src/schemas/custom-field.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };
type Entity = "COMPANY" | "PERSON" | "OPPORTUNITY";

function baseUrl(slug: string): string {
  return apiUrl(`/api/workspaces/${slug}/custom-fields`);
}

/** Definições de campos customizados de uma entidade, com refetch manual. */
export function useCustomFields(slug: string, entity: Entity) {
  const [fields, setFields] = useState<CustomFieldDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl(slug)}?entity=${entity}`);
      const json = (await res.json()) as ApiResponse<CustomFieldDTO[]>;
      setFields(res.ok && json.success && json.data ? json.data : []);
    } catch {
      setFields([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug, entity]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { fields, isLoading, refetch };
}

export async function createCustomField(
  slug: string,
  input: CreateCustomFieldInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(baseUrl(slug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<CustomFieldDTO>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function updateCustomField(
  slug: string,
  id: string,
  input: UpdateCustomFieldInput,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<CustomFieldDTO>;
  return { ok: res.ok && json.success, message: json.message };
}

export async function deleteCustomField(
  slug: string,
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${baseUrl(slug)}/${id}`, { method: "DELETE" });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<unknown>;
  return { ok: res.ok, message: json.message };
}

/**
 * Converte definições em `GridColumn`s dinâmicas. `key` é `cf_<defId>` (leitura
 * via DTO achatado); `customFieldId` roteia a escrita para o objeto
 * `customFields` no PATCH.
 */
export function customFieldColumns(fields: CustomFieldDTO[]): GridColumn[] {
  return fields.map((f): GridColumn => {
    const base = {
      key: `cf_${f.id}`,
      customFieldId: f.id,
      header: f.label,
      required: f.required,
    };
    switch (f.type) {
      case "NUMBER":
        return { ...base, kind: "number" };
      case "DATE":
        return { ...base, kind: "date" };
      case "BOOLEAN":
        return { ...base, kind: "boolean" };
      case "SELECT":
        return {
          ...base,
          kind: "select",
          clearable: true,
          options: f.options.map((o) => ({ value: o, label: o })),
        };
      default:
        return { ...base, kind: "text" };
    }
  });
}
