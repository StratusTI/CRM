"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Loading02Icon,
  TaskDone01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  addDays,
  eachDayOfInterval,
  format,
  isToday,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useResourceList } from "@/src/hooks/use-resource-list";
import type { TaskDTO } from "@/src/schemas/task.schema";

type Range = 7 | 15 | 30;

// ─── Feriados e datas comemorativas brasileiras ────────────────────────────

function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

type Holiday = { label: string; type: "feriado" | "comemorativa" };

function getHolidays(year: number): Map<string, Holiday> {
  const map = new Map<string, Holiday>();
  const easter = easterDate(year);

  function add(date: Date, label: string, type: Holiday["type"] = "feriado") {
    map.set(format(date, "yyyy-MM-dd"), { label, type });
  }
  function addOffset(base: Date, days: number, label: string, type: Holiday["type"] = "feriado") {
    add(addDays(base, days), label, type);
  }

  // Feriados nacionais fixos
  add(new Date(year, 0, 1), "Confraternização Universal");
  add(new Date(year, 3, 21), "Tiradentes");
  add(new Date(year, 4, 1), "Dia do Trabalho");
  add(new Date(year, 8, 7), "Independência do Brasil");
  add(new Date(year, 9, 12), "Nossa Senhora Aparecida");
  add(new Date(year, 10, 2), "Finados");
  add(new Date(year, 10, 15), "Proclamação da República");
  add(new Date(year, 10, 20), "Consciência Negra");
  add(new Date(year, 11, 25), "Natal");

  // Feriados móveis (calculados a partir da Páscoa)
  addOffset(easter, -48, "Carnaval (2ª)", "comemorativa");
  addOffset(easter, -47, "Carnaval", "comemorativa");
  addOffset(easter, -2, "Sexta-feira Santa");
  add(easter, "Páscoa");
  addOffset(easter, 60, "Corpus Christi");

  // Datas comemorativas
  add(new Date(year, 1, 14), "Dia dos Namorados (BR) / Valentim", "comemorativa");
  add(new Date(year, 2, 8), "Dia Internacional da Mulher", "comemorativa");
  add(new Date(year, 4, 11), "Dia das Mães", "comemorativa"); // 2º domingo de maio — aproximado
  add(new Date(year, 5, 12), "Dia dos Namorados", "comemorativa");
  add(new Date(year, 5, 13), "Santo Antônio", "comemorativa");
  add(new Date(year, 5, 24), "São João", "comemorativa");
  add(new Date(year, 7, 12), "Dia dos Pais", "comemorativa"); // 2º domingo de agosto — aproximado
  add(new Date(year, 9, 12), "Dia das Crianças", "comemorativa");
  add(new Date(year, 9, 31), "Halloween", "comemorativa");
  add(new Date(year, 11, 24), "Véspera de Natal", "comemorativa");
  add(new Date(year, 11, 31), "Réveillon", "comemorativa");

  return map;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  TODO: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30",
  IN_PROGRESS: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  DONE: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
};

// ─── Components ───────────────────────────────────────────────────────────

function DayColumn({
  date,
  tasks,
  holiday,
}: {
  date: Date;
  tasks: TaskDTO[];
  holiday?: Holiday;
}) {
  const today = isToday(date);
  const dayName = format(date, "EEE", { locale: ptBR });
  const dayNum = format(date, "d");
  const monthAbbr = format(date, "MMM", { locale: ptBR });

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-card/50 overflow-hidden",
        today && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      {/* Header do dia */}
      <div
        className={cn(
          "flex flex-col items-center gap-0.5 border-b border-border/60 px-2 py-2.5",
          today && "border-primary/30 bg-primary/10",
        )}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {dayName}
        </span>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
            today && "bg-primary text-primary-foreground",
          )}
        >
          {dayNum}
        </span>
        <span className="text-[10px] text-muted-foreground">{monthAbbr}</span>
        {holiday && (
          <span
            className={cn(
              "mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium leading-tight text-center",
              holiday.type === "feriado"
                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
            )}
            title={holiday.label}
          >
            {holiday.label.length > 14 ? `${holiday.label.slice(0, 13)}…` : holiday.label}
          </span>
        )}
      </div>

      {/* Tarefas */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-1.5">
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-[10px] text-muted-foreground/40">—</span>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "rounded-md border px-2 py-1.5 text-[11px] leading-tight",
                STATUS_COLOR[task.status] ?? "bg-muted/50 border-border/40",
              )}
              title={`${task.title} · ${STATUS_LABEL[task.status] ?? task.status}`}
            >
              <span className="line-clamp-2 font-medium">{task.title}</span>
              <span className="mt-0.5 block opacity-70">
                {STATUS_LABEL[task.status] ?? task.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TasksCalendar({ slug }: { slug: string }) {
  const { items: tasks, isLoading } = useResourceList<TaskDTO>(slug, "tasks");
  const [range, setRange] = useState<Range>(7);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));

  const days = eachDayOfInterval({ start: anchor, end: addDays(anchor, range - 1) });
  const year = anchor.getFullYear();
  const holidays = getHolidays(year);

  function prev() { setAnchor((d) => addDays(d, -range)); }
  function next() { setAnchor((d) => addDays(d, range)); }
  function goToday() { setAnchor(startOfDay(new Date())); }

  const tasksByDay = new Map<string, TaskDTO[]>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const key = format(new Date(task.dueDate), "yyyy-MM-dd");
    if (!tasksByDay.has(key)) tasksByDay.set(key, []);
    tasksByDay.get(key)!.push(task);
  }

  const rangeLabel = `${format(anchor, "d MMM", { locale: ptBR })} – ${format(addDays(anchor, range - 1), "d MMM yyyy", { locale: ptBR })}`;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card p-0.5">
          {([7, 15, 30] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                range === r
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r} dias
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={prev} aria-label="Período anterior">
            <HugeiconsIcon icon={ArrowLeft01Icon} />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={next} aria-label="Próximo período">
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </Button>
        </div>

        <span className="font-medium text-sm">{rangeLabel}</span>

        <Button variant="outline" size="sm" className="ml-auto" onClick={goToday}>
          Hoje
        </Button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-red-500/40" />
          Feriado nacional
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-amber-500/40" />
          Data comemorativa
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <HugeiconsIcon icon={TaskDone01Icon} className="size-3.5" />
          {isLoading ? "Carregando…" : `${tasks.filter(t => t.dueDate).length} tarefas com prazo`}
        </span>
      </div>

      {/* Grade */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <HugeiconsIcon icon={Loading02Icon} className="size-5 animate-spin" />
          <span className="text-sm">Carregando tarefas…</span>
        </div>
      ) : (
        <div
          className="flex min-h-0 flex-1 gap-2"
          style={{ minHeight: 400 }}
        >
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            return (
              <DayColumn
                key={key}
                date={day}
                tasks={tasksByDay.get(key) ?? []}
                holiday={holidays.get(key)}
              />
            );
          })}
        </div>
      )}

      {/* Empty state for tasks without due date */}
      {!isLoading && tasks.filter(t => !t.dueDate).length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3.5" />
          {tasks.filter(t => !t.dueDate).length} tarefa(s) sem prazo definido não aparecem no calendário.
        </div>
      )}
    </div>
  );
}
