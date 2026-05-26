"use client";

import "react-grid-layout/css/styles.css";

import {
  Add01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import ReactGridLayout, {
  type Layout,
  useContainerWidth,
} from "react-grid-layout";
import { toast } from "sonner";
import { WIDGET_TYPE_META } from "@/components/dashboards/widget-meta";
import { WidgetPanel } from "@/components/dashboards/widget-panel";
import { WidgetView } from "@/components/dashboards/widget-view";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  applyWidgetLayout,
  deleteWidget,
  useDashboardWidgets,
} from "@/src/hooks/use-dashboard-widgets";
import type { DashboardWidgetDTO } from "@/src/schemas/dashboard-widget.schema";

const COLS = 12;
const ROW_HEIGHT = 40;

function layoutSignature(layout: Layout): string {
  return layout
    .map((item) => `${item.i}:${item.x},${item.y},${item.w},${item.h}`)
    .sort()
    .join("|");
}

function typeLabel(type: DashboardWidgetDTO["type"]): string {
  return WIDGET_TYPE_META.find((meta) => meta.type === type)?.label ?? type;
}

export function DashboardCanvas({
  slug,
  dashboardId,
}: {
  slug: string;
  dashboardId: string;
}) {
  const { widgets, setWidgets, isLoading } = useDashboardWidgets(
    slug,
    dashboardId,
  );
  const { width, containerRef, mounted } = useContainerWidth();

  const [editMode, setEditMode] = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DashboardWidgetDTO | null>(null);

  const layout: Layout = React.useMemo(
    () =>
      widgets.map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: 2,
        minH: 3,
      })),
    [widgets],
  );

  const lastSig = React.useRef("");
  React.useEffect(() => {
    lastSig.current = layoutSignature(layout);
  }, [layout]);

  const persistTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLayoutChange = React.useCallback(
    (next: Layout) => {
      if (!editMode) return;
      const sig = layoutSignature(next);
      if (sig === lastSig.current) return;
      lastSig.current = sig;

      setWidgets((prev) =>
        prev.map((w) => {
          const item = next.find((n) => n.i === w.id);
          return item
            ? { ...w, x: item.x, y: item.y, w: item.w, h: item.h }
            : w;
        }),
      );

      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        void applyWidgetLayout(
          slug,
          dashboardId,
          next.map((item) => ({
            id: item.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          })),
        );
      }, 600);
    },
    [editMode, slug, dashboardId, setWidgets],
  );

  const nextY = React.useMemo(
    () => widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0),
    [widgets],
  );

  function openNew() {
    setEditing(null);
    setPanelOpen(true);
  }

  function openEdit(widget: DashboardWidgetDTO) {
    setEditing(widget);
    setPanelOpen(true);
  }

  async function handleDelete(widget: DashboardWidgetDTO) {
    const previous = widgets;
    setWidgets((prev) => prev.filter((w) => w.id !== widget.id));
    const res = await deleteWidget(slug, dashboardId, widget.id);
    if (!res.ok) {
      setWidgets(previous);
      toast.error(res.message ?? "Não foi possível remover o widget.");
    }
  }

  const actions = (
    <>
      <Button variant="outline" size="sm" onClick={openNew}>
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
        Adicionar widget
      </Button>
      <Button
        variant={editMode ? "default" : "outline"}
        size="sm"
        onClick={() => setEditMode((v) => !v)}
      >
        <HugeiconsIcon
          icon={editMode ? Tick02Icon : PencilEdit02Icon}
          strokeWidth={2}
        />
        {editMode ? "Concluir" : "Editar layout"}
      </Button>
    </>
  );

  return (
    <PageShell action={actions}>
      <div ref={containerRef} className="min-h-full p-3">
        {widgets.length === 0 && !isLoading ? (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground text-sm">
              Este dashboard ainda não tem widgets.
            </p>
            <Button variant="outline" size="sm" onClick={openNew}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              Adicionar primeiro widget
            </Button>
          </div>
        ) : null}

        {mounted && width > 0 && widgets.length > 0 ? (
          <ReactGridLayout
            width={width}
            layout={layout}
            gridConfig={{
              cols: COLS,
              rowHeight: ROW_HEIGHT,
              margin: [12, 12],
              containerPadding: [0, 0],
            }}
            dragConfig={{ enabled: editMode, handle: ".widget-drag-handle" }}
            resizeConfig={{ enabled: editMode }}
            onLayoutChange={handleLayoutChange}
          >
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm"
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-1.5",
                    editMode && "widget-drag-handle cursor-move bg-muted/40",
                  )}
                >
                  <span className="truncate font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    {typeLabel(widget.type)}
                  </span>
                  {editMode ? (
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(widget)}
                        aria-label="Editar widget"
                      >
                        <HugeiconsIcon
                          icon={PencilEdit02Icon}
                          strokeWidth={2}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(widget)}
                        aria-label="Remover widget"
                      >
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 p-2">
                  <WidgetView widget={widget} slug={slug} />
                </div>
              </div>
            ))}
          </ReactGridLayout>
        ) : null}
      </div>

      <WidgetPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        slug={slug}
        dashboardId={dashboardId}
        editing={editing}
        nextY={nextY}
        onCreated={(widget) => setWidgets((prev) => [...prev, widget])}
        onUpdated={(widget) =>
          setWidgets((prev) =>
            prev.map((w) => (w.id === widget.id ? widget : w)),
          )
        }
      />
    </PageShell>
  );
}
