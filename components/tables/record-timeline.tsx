"use client";

import {
  Activity01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTimeline } from "@/src/hooks/use-timeline";
import type { ActivityDTO, TimelineEntity } from "@/src/schemas/activity.schema";

const ACTION_META: Record<
  ActivityDTO["action"],
  { icon: typeof Activity01Icon; color: string; verb: string }
> = {
  CREATED: { icon: PlusSignIcon, color: "text-emerald-600", verb: "criou" },
  UPDATED: {
    icon: PencilEdit02Icon,
    color: "text-blue-600",
    verb: "atualizou",
  },
  DELETED: { icon: Delete02Icon, color: "text-rose-600", verb: "removeu" },
};

/**
 * Feed cronológico de atividades de um registro (timeline). Renderizado no
 * rodapé do `RecordPanel` via `renderExtra`. `userMap` resolve id→nome do ator.
 */
export function RecordTimeline({
  slug,
  entity,
  recordId,
  userMap = {},
}: {
  slug: string;
  entity: TimelineEntity;
  recordId: string;
  userMap?: Record<string, string>;
}) {
  const { items, isLoading } = useTimeline(slug, entity, recordId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={Activity01Icon}
          className="size-4 text-muted-foreground"
        />
        <span className="font-medium text-sm">Atividade</span>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sem atividade ainda.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item) => {
            const meta = ACTION_META[item.action];
            const actor = item.actorUserId
              ? (userMap[item.actorUserId] ?? "Alguém")
              : "Sistema";
            return (
              <li key={item.id} className="flex gap-2.5">
                <div
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted ${meta.color}`}
                >
                  <HugeiconsIcon icon={meta.icon} className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{actor}</span>{" "}
                    {item.summary ?? meta.verb}
                  </p>
                  {item.changedFields.length > 0 ? (
                    <p className="truncate text-muted-foreground text-xs">
                      campos: {item.changedFields.join(", ")}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
