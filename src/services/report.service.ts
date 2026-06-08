import type { Prisma, Report } from "@prisma/client";
import { reportNotFound } from "@/src/errors/app-error";
import { type Row, type RowsByAlias, runQuery } from "@/src/lib/report-data";
import { err, ok, type Result } from "@/src/lib/result";
import { toReportDTO } from "@/src/mappers/report.mapper";
import { ReportRepository } from "@/src/repositories/report.repository";
import type {
  CreateReportInput,
  ReportData,
  ReportDTO,
  ReportQuery,
  ReportSource,
  UpdateReportInput,
} from "@/src/schemas/report.schema";
import { CompanyService } from "@/src/services/company.service";
import { LeadService } from "@/src/services/lead.service";
import { NoteService } from "@/src/services/note.service";
import { OpportunityService } from "@/src/services/opportunity.service";
import { PersonService } from "@/src/services/person.service";
import { ProductService } from "@/src/services/product.service";
import { TaskService } from "@/src/services/task.service";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Busca as linhas brutas da fonte via o service correspondente (com VIEW). */
async function fetchSourceRows(
  userId: string,
  slug: string,
  source: ReportSource,
): Promise<Result<Row[]>> {
  switch (source) {
    case "companies":
      return CompanyService.list(userId, slug);
    case "people":
      return PersonService.list(userId, slug);
    case "opportunities":
      return OpportunityService.list(userId, slug);
    case "leads":
      return LeadService.list(userId, slug);
    case "tasks":
      return TaskService.list(userId, slug);
    case "notes":
      return NoteService.list(userId, slug);
    case "products":
      return ProductService.list(userId, slug);
    default:
      return ok([]);
  }
}

/** Query de fonte única (modo join, 1 dataset) a partir do input legado. */
function legacyInputToQuery(input: CreateReportInput): ReportQuery {
  return {
    mode: "join",
    datasets: [
      { alias: input.source, source: input.source, filters: input.filters },
    ],
    joins: [],
    columns: input.columns.map((c) => `${input.source}.${c}`),
    group: input.groupBy
      ? {
          by: [`${input.source}.${input.groupBy}`],
          aggregations: [{ fn: "count", alias: "count" }],
        }
      : undefined,
    sort: input.sort
      ? {
          field:
            input.sort.field === "count"
              ? "count"
              : `${input.source}.${input.sort.field}`,
          direction: input.sort.direction,
        }
      : undefined,
  };
}

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Report>> {
  const found = await ReportRepository.findById(id);
  if (!found.ok) return found;
  const report = found.value;
  if (!report || report.workspaceId !== workspaceId || report.deletedAt) {
    return err(reportNotFound());
  }
  return ok(report);
}

export const ReportService = {
  async create(
    userId: string,
    slug: string,
    input: CreateReportInput,
  ): Promise<Result<ReportDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "reports",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    const query = input.query ?? legacyInputToQuery(input);
    const created = await ReportRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      source: input.source,
      columns: input.columns,
      filters: input.filters,
      groupBy: input.groupBy ?? null,
      sort: (input.sort ?? null) as Prisma.InputJsonValue | null,
      query: query as Prisma.InputJsonValue,
    });
    if (!created.ok) return created;
    return ok(toReportDTO(created.value));
  },

  async list(userId: string, slug: string): Promise<Result<ReportDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "reports",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const result = await ReportRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toReportDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ReportDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "reports",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const report = await loadInWorkspace(ws.value, id);
    if (!report.ok) return report;
    return ok(toReportDTO(report.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateReportInput,
  ): Promise<Result<ReportDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "reports",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const updated = await ReportRepository.update(id, {
      updatedById: userId,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.columns !== undefined && { columns: input.columns }),
      ...(input.filters !== undefined && { filters: input.filters }),
      ...("groupBy" in input && { groupBy: input.groupBy ?? null }),
      ...("sort" in input && {
        sort: (input.sort ?? null) as Prisma.InputJsonValue | null,
      }),
      ...("query" in input && {
        query: (input.query ?? null) as Prisma.InputJsonValue | null,
      }),
    });
    if (!updated.ok) return updated;
    return ok(toReportDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ReportDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "reports",
      action: "DELETE",
    });
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const removed = await ReportRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toReportDTO(removed.value));
  },

  /** Processa o relatório (busca da fonte + filtros/agrupamento/ordenação). */
  async getData(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ReportData>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "reports",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const found = await loadInWorkspace(ws.value, id);
    if (!found.ok) return found;
    const report = toReportDTO(found.value);

    // Busca as linhas de cada dataset (uma vez por alias).
    const rowsByAlias: RowsByAlias = {};
    for (const dataset of report.query.datasets) {
      if (rowsByAlias[dataset.alias]) continue;
      const rows = await fetchSourceRows(userId, slug, dataset.source);
      if (!rows.ok) return rows;
      rowsByAlias[dataset.alias] = rows.value;
    }

    return ok(runQuery(report.query, rowsByAlias));
  },
};
