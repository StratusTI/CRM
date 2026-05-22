"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  CreateWorkspaceInput,
  WorkspaceDTO,
} from "@/src/schemas/workspace.schema";

export function useCreateWorkspace() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createWorkspace(
    input: CreateWorkspaceInput,
  ): Promise<WorkspaceDTO | null> {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        setError(json?.message ?? "Não foi possível criar a workspace.");
        return null;
      }

      const workspace = json.data as WorkspaceDTO;
      router.push(`/${workspace.slug}`);
      return workspace;
    } catch {
      setError("Erro de rede. Tente novamente.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { createWorkspace, isLoading, error };
}
