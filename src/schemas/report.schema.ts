import { z } from "zod";
import { FILTER_OPERATORS } from "@/src/schemas/dashboard-widget.schema";

/** Contrato da feature Report (relatórios tabulares + export). */

/** Fontes suportadas: entidades de CRM com listagem por workspace. */
export const REPORT_SOURCES = [
  "companies",
  "people",
  "opportunities",
  "leads",
  "tasks",
  "notes",
  "products",
] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

/** Funções de agregação suportadas no agrupamento. */
export const AGGREGATION_FNS = ["count", "sum", "avg", "min", "max"] as const;
export type AggregationFn = (typeof AGGREGATION_FNS)[number];

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do relatório")
  .max(120, "Nome muito longo");

const ColumnsSchema = z
  .array(z.string().trim().min(1).max(100))
  .min(1, "Selecione ao menos uma coluna")
  .max(50);

const FilterSchema = z.object({
  field: z.string().trim().min(1).max(100),
  operator: z.enum(FILTER_OPERATORS),
  value: z.string().trim().max(500).optional().default(""),
});

const SortSchema = z.object({
  field: z.string().trim().min(1).max(100),
  direction: z.enum(["asc", "desc"]),
});

/* --------------------------------------------------------------------------
 * Mega relatório: query normalizada (múltiplas fontes + JOIN/UNION + agregação)
 * ------------------------------------------------------------------------ */

/** Alias de dataset: minúsculas, dígitos e "_" (usado como prefixo de coluna). */
const AliasSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9_]+$/, "Alias inválido");

/** Uma fonte dentro da query, com filtros próprios. */
const DatasetSchema = z.object({
  alias: AliasSchema,
  source: z.enum(REPORT_SOURCES),
  filters: z.array(FilterSchema).max(20).optional().default([]),
});

/** Mesclagem entre dois datasets por chave (FK → id). */
const JoinSchema = z.object({
  leftAlias: AliasSchema,
  rightAlias: AliasSchema,
  leftField: z.string().trim().min(1).max(100),
  rightField: z.string().trim().min(1).max(100),
  type: z.enum(["inner", "left"]),
});

/** Uma agregação sobre o grupo (count ignora `field`). */
const AggregationSchema = z.object({
  fn: z.enum(AGGREGATION_FNS),
  field: z.string().trim().min(1).max(100).optional(),
  alias: z.string().trim().min(1).max(60),
});

/** Agrupamento por 1+ colunas + agregações. */
const GroupSchema = z.object({
  by: z.array(z.string().trim().min(1).max(100)).min(1).max(5),
  aggregations: z.array(AggregationSchema).min(1).max(10),
});

/** Coluna de UNION: chave de saída mapeada ao campo de cada dataset. */
const UnionColumnSchema = z.object({
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(60),
  fields: z.record(AliasSchema, z.string().trim().min(1).max(100)),
});

/** Modo JOIN: enriquece o dataset base com colunas dos relacionados. */
const JoinQuerySchema = z.object({
  mode: z.literal("join"),
  datasets: z.array(DatasetSchema).min(1).max(5),
  joins: z.array(JoinSchema).max(4).optional().default([]),
  /** Colunas namespaced: "alias.field". */
  columns: ColumnsSchema,
  group: GroupSchema.optional(),
  sort: SortSchema.optional(),
});

/** Modo UNION: empilha registros de fontes distintas com colunas mapeadas. */
const UnionQuerySchema = z.object({
  mode: z.literal("union"),
  datasets: z.array(DatasetSchema).min(2).max(5),
  columns: z.array(UnionColumnSchema).min(1).max(50),
  includeSource: z.boolean().optional().default(false),
  group: GroupSchema.optional(),
  sort: SortSchema.optional(),
});

export const ReportQuerySchema = z.discriminatedUnion("mode", [
  JoinQuerySchema,
  UnionQuerySchema,
]);

export const CreateReportSchema = z.object({
  name: NameSchema,
  source: z.enum(REPORT_SOURCES),
  columns: ColumnsSchema,
  filters: z.array(FilterSchema).max(20).optional().default([]),
  groupBy: z.string().trim().max(100).optional(),
  sort: SortSchema.optional(),
  query: ReportQuerySchema.optional(),
});

export const UpdateReportSchema = z
  .object({
    name: NameSchema,
    columns: ColumnsSchema,
    filters: z.array(FilterSchema).max(20),
    groupBy: z.string().trim().max(100).nullable(),
    sort: SortSchema.nullable(),
    query: ReportQuerySchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const ReportOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(REPORT_SOURCES),
  columns: z.array(z.string()),
  filters: z.array(FilterSchema),
  groupBy: z.string().nullable(),
  sort: SortSchema.nullable(),
  query: ReportQuerySchema,
  position: z.number(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

/** Coluna de saída processada: chave estável + rótulo amigável. */
const ReportColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
});

/** Resultado processado (linhas indexadas por `column.key`). */
export const ReportDataSchema = z.object({
  columns: z.array(ReportColumnSchema),
  rows: z.array(z.record(z.string(), z.unknown())),
  grouped: z.boolean(),
  total: z.number(),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type UpdateReportInput = z.infer<typeof UpdateReportSchema>;
export type ReportDTO = z.infer<typeof ReportOutputSchema>;
export type ReportFilter = z.infer<typeof FilterSchema>;
export type ReportSort = z.infer<typeof SortSchema>;
export type ReportData = z.infer<typeof ReportDataSchema>;
export type ReportColumn = z.infer<typeof ReportColumnSchema>;
export type ReportQuery = z.infer<typeof ReportQuerySchema>;
export type ReportDataset = z.infer<typeof DatasetSchema>;
export type ReportJoin = z.infer<typeof JoinSchema>;
export type ReportAggregation = z.infer<typeof AggregationSchema>;
export type ReportGroup = z.infer<typeof GroupSchema>;
export type ReportUnionColumn = z.infer<typeof UnionColumnSchema>;
export type JoinQuery = z.infer<typeof JoinQuerySchema>;
export type UnionQuery = z.infer<typeof UnionQuerySchema>;
