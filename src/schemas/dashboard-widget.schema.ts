import { z } from "zod";
import { normalizedUrl } from "@/src/schemas/shared";

/** Contrato dos widgets de um dashboard (grid customizável). */

export const WIDGET_TYPES = ["CHART", "VIEW", "IFRAME", "RICH_TEXT"] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

/** Subtipos de chart (botões do topo do painel). */
export const CHART_TYPES = [
  "vertical",
  "horizontal",
  "line",
  "pie",
  "aggregate",
] as const;
export type ChartType = (typeof CHART_TYPES)[number];

/** Fontes de dados disponíveis para o widget "view" (sempre layout tabela). */
export const VIEW_SOURCES = [
  "companies",
  "people",
  "opportunities",
  "tasks",
  "notes",
] as const;
export type ViewSource = (typeof VIEW_SOURCES)[number];

export const FILTER_OPERATORS = [
  "contains",
  "equals",
  "not_equals",
  "is_empty",
  "is_not_empty",
] as const;

/* ----------------------------- config por tipo ---------------------------- */

const ViewFilterSchema = z.object({
  field: z.string().trim().min(1).max(100),
  operator: z.enum(FILTER_OPERATORS),
  value: z.string().trim().max(500).optional().default(""),
});

const ViewSortSchema = z.object({
  field: z.string().trim().min(1).max(100),
  direction: z.enum(["asc", "desc"]),
});

/** Modo de ordenação de um eixo (sem ordenação / crescente / decrescente). */
export const SORT_MODES = ["none", "asc", "desc"] as const;
const SortModeSchema = z.enum(SORT_MODES);

/**
 * Customização completa do chart (ver custom-charts.md). Os campos relevantes
 * variam por `chartType`; campos não usados pelo tipo são ignorados no render.
 * Agregação do valor: soma quando o campo de valor é numérico, senão contagem.
 */
export const ChartConfigSchema = z.object({
  chartType: z.enum(CHART_TYPES),

  // Data
  source: z.enum(VIEW_SOURCES).default("companies"),
  filters: z.array(ViewFilterSchema).max(20).default([]),

  // Eixos / dados
  /** Dimensão (categorias): X em vertical/line, Y em horizontal, fatias na pizza. */
  xField: z.string().trim().max(100).optional(),
  /** Medida agregada. Vazio = contagem de registros. */
  yField: z.string().trim().max(100).optional(),
  /** Série secundária (barras empilhadas / múltiplas linhas). */
  groupBy: z.string().trim().max(100).optional(),
  xSort: SortModeSchema.default("none"),
  ySort: SortModeSchema.default("none"),
  omitZero: z.boolean().default(false),
  cumulative: z.boolean().default(false),
  yMin: z.number().optional(),
  yMax: z.number().optional(),
  /** Pizza: esconde categorias vazias. */
  hideEmpty: z.boolean().default(false),

  // Estilo
  xAxisName: z.string().trim().max(100).default(""),
  yAxisName: z.string().trim().max(100).default(""),
  stacked: z.boolean().default(false),
  dataLabels: z.boolean().default(false),
  legend: z.boolean().default(true),
  prefix: z.string().trim().max(20).default(""),
  suffix: z.string().trim().max(20).default(""),
});

export const ViewConfigSchema = z.object({
  source: z.enum(VIEW_SOURCES),
  fields: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  filters: z.array(ViewFilterSchema).max(20).default([]),
  sort: z.array(ViewSortSchema).max(10).default([]),
});

export const IframeConfigSchema = z.object({
  url: normalizedUrl("Informe uma URL válida para o iframe", 2000),
});

export const RichTextConfigSchema = z.object({
  html: z.string().max(50_000, "Conteúdo muito longo").default(""),
});

/** Schema de config correspondente ao tipo do widget. */
export function widgetConfigSchema(type: WidgetType) {
  switch (type) {
    case "CHART":
      return ChartConfigSchema;
    case "VIEW":
      return ViewConfigSchema;
    case "IFRAME":
      return IframeConfigSchema;
    case "RICH_TEXT":
      return RichTextConfigSchema;
  }
}

/* ------------------------------- layout (grid) ----------------------------- */

const layoutShape = {
  x: z.int().min(0).max(100).default(0),
  y: z.int().min(0).max(1000).default(0),
  w: z.int().min(1).max(12).default(4),
  h: z.int().min(1).max(60).default(6),
};

/* --------------------------------- create ---------------------------------- */

export const CreateWidgetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("CHART"),
    config: ChartConfigSchema,
    ...layoutShape,
  }),
  z.object({
    type: z.literal("VIEW"),
    config: ViewConfigSchema,
    ...layoutShape,
  }),
  z.object({
    type: z.literal("IFRAME"),
    config: IframeConfigSchema,
    ...layoutShape,
  }),
  z.object({
    type: z.literal("RICH_TEXT"),
    config: RichTextConfigSchema,
    ...layoutShape,
  }),
]);

/* --------------------------------- update ---------------------------------- */

/** Atualização parcial. `config` é validado contra o tipo do widget no service. */
export const UpdateWidgetSchema = z
  .object({
    x: layoutShape.x.unwrap(),
    y: layoutShape.y.unwrap(),
    w: layoutShape.w.unwrap(),
    h: layoutShape.h.unwrap(),
    config: z.unknown(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

/** Atualização em lote das posições/tamanhos (drag/resize do grid). */
export const WidgetLayoutBatchSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        x: layoutShape.x.unwrap(),
        y: layoutShape.y.unwrap(),
        w: layoutShape.w.unwrap(),
        h: layoutShape.h.unwrap(),
      }),
    )
    .max(200),
});

/* --------------------------------- output ---------------------------------- */

export const WidgetOutputSchema = z.object({
  id: z.string(),
  dashboardId: z.string(),
  type: z.enum(WIDGET_TYPES),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  config: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SortMode = (typeof SORT_MODES)[number];
export type ChartConfig = z.infer<typeof ChartConfigSchema>;
export type ViewConfig = z.infer<typeof ViewConfigSchema>;
export type IframeConfig = z.infer<typeof IframeConfigSchema>;
export type RichTextConfig = z.infer<typeof RichTextConfigSchema>;
export type CreateWidgetInput = z.infer<typeof CreateWidgetSchema>;
export type UpdateWidgetInput = z.infer<typeof UpdateWidgetSchema>;
export type WidgetLayoutBatchInput = z.infer<typeof WidgetLayoutBatchSchema>;
export type DashboardWidgetDTO = z.infer<typeof WidgetOutputSchema>;
