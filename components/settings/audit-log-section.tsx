"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { type AuditFilters, useAuditLogs } from "@/src/hooks/use-audit-logs";
import { useWorkspaceLookups } from "@/src/hooks/use-workspace-lookups";

const LOOKUP_KINDS = ["users"] as const;

const ENTITY_LABELS: Record<string, string> = {
  company: "Empresa",
  person: "Pessoa",
  opportunity: "Oportunidade",
  task: "Tarefa",
  note: "Anotação",
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Criou",
  UPDATED: "Atualizou",
  DELETED: "Removeu",
};

const ACTION_COLORS: Record<string, string> = {
  CREATED: "text-emerald-600",
  UPDATED: "text-blue-600",
  DELETED: "text-rose-600",
};

const ALL = "__all__";

export function AuditLogSection({ slug }: { slug: string }) {
  const [filters, setFilters] = useState<AuditFilters>({});
  const { items, isLoading } = useAuditLogs(slug, filters);
  const { lookups } = useWorkspaceLookups(slug, [...LOOKUP_KINDS]);
  const userMap = lookups.maps.users;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading font-semibold text-lg tracking-tight">
            Registro de auditoria
          </h2>
          <p className="text-muted-foreground text-sm">
            Histórico de quem criou, alterou ou removeu registros no workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filters.entity ?? ALL}
            onValueChange={(v) =>
              setFilters((f) => ({
                ...f,
                entity: !v || v === ALL ? undefined : v,
              }))
            }
          >
            <SelectTrigger size="sm" className="w-36">
              <span>
                {filters.entity ? ENTITY_LABELS[filters.entity] : "Tudo"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as entidades</SelectItem>
              <SelectItem value="company">Empresas</SelectItem>
              <SelectItem value="person">Pessoas</SelectItem>
              <SelectItem value="opportunity">Oportunidades</SelectItem>
              <SelectItem value="task">Tarefas</SelectItem>
              <SelectItem value="note">Anotações</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Nenhuma atividade registrada.
          </p>
        ) : (
          items.map((item) => {
            const actor = item.actorUserId
              ? (userMap[item.actorUserId] ?? "Alguém")
              : "Sistema";
            return (
              <Card
                key={item.id}
                size="sm"
                className="flex-row items-center justify-between gap-4 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="font-medium">{actor}</span>{" "}
                    <span className={ACTION_COLORS[item.action]}>
                      {ACTION_LABELS[item.action]?.toLowerCase()}
                    </span>{" "}
                    {item.summary ?? ENTITY_LABELS[item.entity] ?? item.entity}
                  </p>
                  {item.changedFields.length > 0 ? (
                    <p className="truncate text-muted-foreground text-xs">
                      campos: {item.changedFields.join(", ")}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                  {format(new Date(item.createdAt), "dd/MM/yy HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
