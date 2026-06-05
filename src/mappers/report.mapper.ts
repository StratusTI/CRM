import type { Report } from "@prisma/client";
import type {
  ReportDTO,
  ReportFilter,
  ReportSort,
} from "@/src/schemas/report.schema";

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
