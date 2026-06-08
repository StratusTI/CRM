import type { Report } from "@prisma/client";
import type {
  ReportDTO,
  ReportFilter,
  ReportQuery,
  ReportSort,
} from "@/src/schemas/report.schema";

/**
 * Sintetiza uma `ReportQuery` (modo join, dataset único) a partir dos campos
 * legados de um relatório antigo — garante que relatórios criados antes do
 * "mega relatório" continuem funcionando sem migração de dados.
 */
export function legacyToQuery(report: Report): ReportQuery {
  const source = report.source as ReportDTO["source"];
  const columns = (report.columns as string[]) ?? [];
  const filters = (report.filters as ReportFilter[]) ?? [];
  const sort = (report.sort as ReportSort | null) ?? null;
  const groupBy = report.groupBy;

  // Em modo agrupado a contagem usa o alias "count" (comportamento legado).
  const namespacedSort = sort
    ? {
        field: sort.field === "count" ? "count" : `${source}.${sort.field}`,
        direction: sort.direction,
      }
    : undefined;

  return {
    mode: "join",
    datasets: [{ alias: source, source, filters }],
    joins: [],
    columns: columns.map((c) => `${source}.${c}`),
    group: groupBy
      ? {
          by: [`${source}.${groupBy}`],
          aggregations: [{ fn: "count", alias: "count" }],
        }
      : undefined,
    sort: namespacedSort,
  };
}

/** `Prisma.Report` → `ReportDTO` (Json → tipos; datas em ISO). */
export function toReportDTO(report: Report): ReportDTO {
  return {
    id: report.id,
    name: report.name,
    source: report.source as ReportDTO["source"],
    columns: (report.columns as string[]) ?? [],
    filters: (report.filters as ReportFilter[]) ?? [],
    groupBy: report.groupBy,
    sort: (report.sort as ReportSort | null) ?? null,
    query: (report.query as ReportQuery | null) ?? legacyToQuery(report),
    position: report.position,
    workspaceId: report.workspaceId,
    createdById: report.createdById,
    updatedById: report.updatedById,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    deletedAt:
      report.deletedAt === null ? null : report.deletedAt.toISOString(),
  };
}
