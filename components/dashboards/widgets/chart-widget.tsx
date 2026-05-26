"use client";

import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import * as React from "react";
import {
  aggregateChart,
  aggregateTotal,
  type Row,
} from "@/components/dashboards/widget-data";
import { useResourceList } from "@/src/hooks/use-resource-list";
import type { ChartConfig } from "@/src/schemas/dashboard-widget.schema";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
];

/** Tema nivo que herda a cor do texto do container (claro/escuro). */
const THEME = {
  text: { fill: "currentColor", fontSize: 11 },
  axis: {
    ticks: { text: { fill: "currentColor" }, line: { stroke: "transparent" } },
    legend: { text: { fill: "currentColor", fontSize: 11 } },
    domain: { line: { stroke: "currentColor", strokeOpacity: 0.15 } },
  },
  grid: { line: { stroke: "currentColor", strokeOpacity: 0.08 } },
  legends: { text: { fill: "currentColor" } },
  tooltip: {
    container: {
      background: "var(--color-popover)",
      color: "var(--color-popover-foreground)",
      fontSize: 12,
    },
  },
} as const;

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center px-3 text-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}

export function ChartWidget({
  slug,
  config,
}: {
  slug: string;
  config: ChartConfig;
}) {
  const query = React.useMemo(() => {
    if (config.source !== "socials") return undefined;
    const params = new URLSearchParams({
      metric: config.yField || "views",
      platforms: config.platforms.join(","),
    });
    return params.toString();
  }, [config.source, config.platforms, config.yField]);

  const { items, isLoading } = useResourceList<Row>(slug, config.source, query);

  const data = React.useMemo(
    () => aggregateChart(items, config),
    [items, config],
  );
  const total = React.useMemo(
    () => aggregateTotal(items, config),
    [items, config],
  );

  if (isLoading) return <Empty message="Carregando…" />;

  if (config.source === "socials" && config.platforms.length === 0) {
    return <Empty message="Selecione ao menos uma rede no painel." />;
  }

  /* -------------------------------- aggregate ------------------------------ */
  if (config.chartType === "aggregate") {
    const formatted = new Intl.NumberFormat("pt-BR").format(total);
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <span className="font-heading font-semibold text-4xl text-foreground tabular-nums">
          {config.prefix}
          {formatted}
          {config.suffix}
        </span>
        {config.xAxisName ? (
          <span className="mt-1 text-xs uppercase tracking-wide">
            {config.xAxisName}
          </span>
        ) : null}
      </div>
    );
  }

  if (!config.xField) {
    return (
      <Empty message="Escolha o campo a exibir na customização do gráfico." />
    );
  }
  if (data.categories.length === 0) {
    return <Empty message="Sem dados para os filtros atuais." />;
  }

  const legends = config.legend
    ? [
        {
          dataFrom: "keys" as const,
          anchor: "bottom" as const,
          direction: "row" as const,
          translateY: 46,
          itemWidth: 80,
          itemHeight: 16,
          symbolSize: 10,
        },
      ]
    : [];
  const bottomMargin = config.legend ? 56 : 36;

  /* ---------------------------------- pie ---------------------------------- */
  if (config.chartType === "pie") {
    const pieData = data.categories.map((category) => ({
      id: category,
      value: data.totalOf(category),
    }));
    return (
      <div className="h-full w-full text-muted-foreground">
        <ResponsivePie
          data={pieData}
          margin={{
            top: 12,
            right: 12,
            bottom: config.legend ? 40 : 12,
            left: 12,
          }}
          innerRadius={0.5}
          padAngle={1}
          cornerRadius={3}
          colors={COLORS}
          borderWidth={0}
          enableArcLinkLabels={false}
          enableArcLabels={config.dataLabels}
          arcLabelsTextColor="#fff"
          theme={THEME}
          legends={
            config.legend
              ? [
                  {
                    anchor: "bottom",
                    direction: "row",
                    translateY: 36,
                    itemWidth: 70,
                    itemHeight: 16,
                    symbolSize: 10,
                  },
                ]
              : []
          }
        />
      </div>
    );
  }

  /* ---------------------------------- line --------------------------------- */
  if (config.chartType === "line") {
    const lineData = data.seriesKeys.map((series) => ({
      id: series,
      data: data.categories.map((category) => ({
        x: category,
        y: data.valueAt(category, series),
      })),
    }));
    return (
      <div className="h-full w-full text-muted-foreground">
        <ResponsiveLine
          data={lineData}
          margin={{ top: 12, right: 16, bottom: bottomMargin, left: 48 }}
          colors={COLORS}
          curve="monotoneX"
          enableArea={config.stacked}
          areaOpacity={0.15}
          pointSize={6}
          pointColor={{ from: "color" }}
          useMesh
          yScale={{
            type: "linear",
            min: config.yMin ?? "auto",
            max: config.yMax ?? "auto",
            stacked: config.stacked,
          }}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            legend: config.xAxisName || undefined,
            legendPosition: "middle",
            legendOffset: 40,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            legend: config.yAxisName || undefined,
            legendPosition: "middle",
            legendOffset: -42,
          }}
          theme={THEME}
          legends={legends}
        />
      </div>
    );
  }

  /* ------------------------------- bar (v / h) ----------------------------- */
  const isHorizontal = config.chartType === "horizontal";
  const barData = data.categories.map((category) => {
    const entry: Record<string, string | number> = { category };
    for (const series of data.seriesKeys) {
      entry[series] = data.valueAt(category, series);
    }
    return entry;
  });

  const categoryLegend = config.xAxisName || undefined;
  const valueLegend = config.yAxisName || undefined;

  return (
    <div className="h-full w-full text-muted-foreground">
      <ResponsiveBar
        data={barData}
        keys={data.seriesKeys}
        indexBy="category"
        layout={isHorizontal ? "horizontal" : "vertical"}
        groupMode={config.stacked ? "stacked" : "grouped"}
        margin={{
          top: 12,
          right: 16,
          bottom: bottomMargin,
          left: 48,
        }}
        padding={0.3}
        colors={COLORS}
        borderRadius={3}
        enableLabel={config.dataLabels}
        valueScale={{
          type: "linear",
          min: config.yMin ?? "auto",
          max: config.yMax ?? "auto",
        }}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          legend: isHorizontal ? valueLegend : categoryLegend,
          legendPosition: "middle",
          legendOffset: 40,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: isHorizontal ? categoryLegend : valueLegend,
          legendPosition: "middle",
          legendOffset: -42,
        }}
        theme={THEME}
        legends={legends}
      />
    </div>
  );
}
