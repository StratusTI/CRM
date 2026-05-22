"use client";

import { ChartWidget } from "@/components/dashboards/widgets/chart-widget";
import { IframeWidget } from "@/components/dashboards/widgets/iframe-widget";
import { RichTextWidget } from "@/components/dashboards/widgets/rich-text-widget";
import { ViewWidget } from "@/components/dashboards/widgets/view-widget";
import type {
  ChartConfig,
  DashboardWidgetDTO,
  IframeConfig,
  RichTextConfig,
  ViewConfig,
} from "@/src/schemas/dashboard-widget.schema";

/** Renderiza o conteúdo de um widget conforme o tipo (config é Json no DTO). */
export function WidgetView({
  widget,
  slug,
}: {
  widget: DashboardWidgetDTO;
  slug: string;
}) {
  switch (widget.type) {
    case "CHART":
      return <ChartWidget slug={slug} config={widget.config as ChartConfig} />;
    case "VIEW":
      return <ViewWidget slug={slug} config={widget.config as ViewConfig} />;
    case "IFRAME":
      return <IframeWidget config={widget.config as IframeConfig} />;
    case "RICH_TEXT":
      return <RichTextWidget config={widget.config as RichTextConfig} />;
    default:
      return null;
  }
}
