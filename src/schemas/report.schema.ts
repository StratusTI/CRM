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

export const CreateReportSchema = z.object({
  name: NameSchema,
  source: z.enum(REPORT_SOURCES),
  columns: ColumnsSchema,
  filters: z.array(FilterSchema).max(20).optional().default([]),
  groupBy: z.string().trim().max(100).optional(),
  sort: SortSchema.optional(),
});

export const UpdateReportSchema = z
  .object({
    name: NameSchema,
    columns: ColumnsSchema,
    filters: z.array(FilterSchema).max(20),
    groupBy: z.string().trim().max(100).nullable(),
    sort: SortSchema.nullable(),
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
  position: z.number(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

/** Resultado processado (linhas) — quando agrupado, traz a contagem por grupo. */
export const ReportDataSchema = z.object({
  columns: z.array(z.string()),
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
