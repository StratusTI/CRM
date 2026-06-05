"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import {
  can,
  type PermissionAction,
  type PermissionMap,
} from "@/src/lib/permissions";

type MeAccess = { isOwner: boolean; permissions: PermissionMap };

/**
 * Permissões efetivas do usuário atual na workspace, com um helper `can`.
 * Owners têm acesso total. Usado para esconder/desabilitar ações na UI.
 */
export function usePermissions(slug: string) {
  const [access, setAccess] = useState<MeAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/workspaces/${slug}/me/permissions`));
      const json = await res.json();
      setAccess(res.ok && json.success ? (json.data as MeAccess) : null);
    } catch {
      setAccess(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const check = useCallback(
    (resource: string, action: PermissionAction): boolean => {
      if (!access) return false;
      if (access.isOwner) return true;
      return can(access.permissions, resource, action);
    },
    [access],
  );

  return { can: check, isOwner: access?.isOwner ?? false, isLoading };
}
