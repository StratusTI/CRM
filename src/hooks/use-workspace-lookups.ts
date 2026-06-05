"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";

export type LookupKind =
  | "users"
  | "companies"
  | "people"
  | "opportunities"
  | "pipelines"
  | "stages"
  | "products";

export type Option = { value: string; label: string };

export type Lookups = {
  maps: Record<LookupKind, Record<string, string>>;
  options: Record<LookupKind, Option[]>;
};

/**
 * Recurso da API por tipo de lookup (usuários vêm de `members`). `pipelines` e
 * `stages` compartilham o endpoint de pipelines — as etapas são achatadas a
 * partir das etapas aninhadas de cada pipeline.
 */
const RESOURCE_PATH: Record<LookupKind, string> = {
  users: "members",
  companies: "companies",
  people: "people",
  opportunities: "opportunities",
  pipelines: "pipelines",
  stages: "pipelines",
  products: "products",
};

type RawItem = {
  id: string;
  name?: string | null;
  title?: string | null;
  email?: string | null;
  stages?: { id: string; name: string }[] | null;
};

/** Achata as etapas de todos os pipelines numa lista de itens id→nome. */
function flattenStages(pipelines: RawItem[]): RawItem[] {
  return pipelines.flatMap((p) =>
    Array.isArray(p.stages)
      ? p.stages.map((s) => ({ id: s.id, name: s.name }))
      : [],
  );
}

function labelOf(item: RawItem): string {
  return item.name || item.title || item.email || item.id;
}

function emptyLookups(): Lookups {
  return {
    maps: {
      users: {},
      companies: {},
      people: {},
      opportunities: {},
      pipelines: {},
      stages: {},
      products: {},
    },
    options: {
      users: [],
      companies: [],
      people: [],
      opportunities: [],
      pipelines: [],
      stages: [],
      products: [],
    },
  };
}

/**
 * Busca os recursos relacionados (`kinds`) da workspace e devolve mapas
 * id→nome e listas de opções para resolver/selecionar relações.
 * `kinds` deve ser estável (definido em nível de módulo).
 */
export function useWorkspaceLookups(slug: string, kinds: LookupKind[]) {
  const [lookups, setLookups] = useState<Lookups>(emptyLookups);
  const [isLoading, setIsLoading] = useState(true);

  const kindsKey = JSON.stringify(kinds);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    // Using kinds from the closure, but the effect only re-runs when kindsKey changes.
    const currentKinds = JSON.parse(kindsKey) as LookupKind[];

    (async () => {
      const results = await Promise.all(
        currentKinds.map(async (kind) => {
          try {
            const res = await fetch(
              apiUrl(`/api/workspaces/${slug}/${RESOURCE_PATH[kind]}`),
            );
            const json = await res.json();
            const data: RawItem[] =
              res.ok && json.success && Array.isArray(json.data)
                ? json.data
                : [];
            const items = kind === "stages" ? flattenStages(data) : data;
            return [kind, items] as const;
          } catch {
            return [kind, [] as RawItem[]] as const;
          }
        }),
      );

      if (!active) return;

      const next = emptyLookups();
      for (const [kind, items] of results) {
        for (const item of items) {
          const label = labelOf(item);
          next.maps[kind][item.id] = label;
          next.options[kind].push({ value: item.id, label });
        }
      }

      setLookups((prev) => {
        // Simple optimization: only update if something changed
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [slug, kindsKey]);

  return { lookups, isLoading };
}
