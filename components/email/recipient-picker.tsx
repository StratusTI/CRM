"use client";

import {
  CheckmarkCircle01Icon,
  Search01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import { Input } from "@/components/ui/input";
import type { PersonDTO } from "@/src/schemas/person.schema";

export type RecipientSelection =
  | { scope: "all" }
  | { scope: "selected"; personIds: string[] };

type Props = {
  slug: string;
  value: RecipientSelection;
  onChange: (next: RecipientSelection) => void;
};

export function RecipientPicker({ slug, value, onChange }: Props) {
  const [people, setPeople] = useState<PersonDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/workspaces/${slug}/people`));
        const json = await res.json();
        if (!active) return;
        if (res.ok && json.success && Array.isArray(json.data)) {
          setPeople(json.data as PersonDTO[]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const peopleWithEmail = useMemo(
    () => people.filter((p) => p.emails.length > 0),
    [people],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return peopleWithEmail;
    return peopleWithEmail.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.emails.some((e) => e.toLowerCase().includes(q)),
    );
  }, [peopleWithEmail, search]);

  const selectedIds =
    value.scope === "selected" ? new Set(value.personIds) : new Set<string>();

  const toggle = (id: string) => {
    if (value.scope !== "selected") {
      onChange({ scope: "selected", personIds: [id] });
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ scope: "selected", personIds: Array.from(next) });
  };

  const selectAll = () => onChange({ scope: "all" });
  const clearAll = () => onChange({ scope: "selected", personIds: [] });

  const totalWithEmail = peopleWithEmail.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
            value.scope === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:bg-muted"
          }`}
        >
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
          <span>Todos com email ({totalWithEmail})</span>
          {value.scope === "all" ? (
            <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} />
          ) : null}
        </button>
        {value.scope === "selected" ? (
          <span className="text-muted-foreground text-sm">
            {value.personIds.length} pessoa(s) selecionada(s)
            {value.personIds.length > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="ml-2 underline hover:text-foreground"
              >
                limpar
              </button>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={2}
          className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pessoa ou email…"
          className="pl-9"
        />
      </div>

      <div className="max-h-72 overflow-auto rounded-md border border-border">
        {isLoading ? (
          <div className="p-4 text-muted-foreground text-sm">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-muted-foreground text-sm">
            Nenhuma pessoa com email encontrada.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((p) => {
              const checked =
                value.scope === "all" ? true : selectedIds.has(p.id);
              const disabled = value.scope === "all";
              return (
                <li key={p.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40 ${
                      disabled ? "cursor-default opacity-60" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(p.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm">
                        {p.name}
                      </div>
                      <div className="truncate text-muted-foreground text-xs">
                        {p.emails.join(", ")}
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
