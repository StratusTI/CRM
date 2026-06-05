import type { ReportFilter, ReportSort } from "@/src/schemas/report.schema";

/**
 * Processamento de relatórios no servidor: filtra, ordena, projeta colunas e
 * (opcionalmente) agrupa contando ocorrências. Semântica idêntica à dos
 * widgets de dashboard (`components/dashboards/widget-data.ts`).
 */

export type Row = Record<string, unknown>;

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function passesFilters(row: Row, filters: ReportFilter[]): boolean {
  return filters.every((filter) => {
    const raw = row[filter.field];
    const hay = asText(raw).toLowerCase();
    const needle = (filter.value ?? "").toLowerCase();
    switch (filter.operator) {
      case "contains":
        return hay.includes(needle);
      case "equals":
        return hay === needle;
      case "not_equals":
        return hay !== needle;
      case "is_empty":
        return hay === "";
      case "is_not_empty":
        return hay !== "";
      default:
        return true;
    }
  });
}

function sortRows(rows: Row[], sort: ReportSort | null | undefined): Row[] {
  if (!sort) return rows;
  const dir = sort.direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = asText(a[sort.field]);
    const bv = asText(b[sort.field]);
    const an = Number(av);
    const bn = Number(bv);
    if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
    return av.localeCompare(bv) * dir;
  });
}

export type ProcessedReport = {
  columns: string[];
  rows: Row[];
  grouped: boolean;
  total: number;
};

/** Aplica filtros/ordenação/colunas e, se houver `groupBy`, agrupa por contagem. */
export function processReport(
  data: Row[],
  options: {
    columns: string[];
    filters: ReportFilter[];
    groupBy?: string | null;
    sort?: ReportSort | null;
  },
): ProcessedReport {
  const filtered = data.filter((r) => passesFilters(r, options.filters));

  if (options.groupBy) {
    const counts = new Map<string, number>();
    for (const row of filtered) {
      const key = asText(row[options.groupBy]) || "—";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let rows: Row[] = [...counts.entries()].map(([group, count]) => ({
      [options.groupBy as string]: group,
      count,
    }));
    rows = sortRows(rows, options.sort);
    return {
      columns: [options.groupBy, "count"],
      rows,
      grouped: true,
      total: filtered.length,
    };
  }

  const sorted = sortRows(filtered, options.sort);
  const rows = sorted.map((row) => {
    const projected: Row = {};
    for (const col of options.columns) projected[col] = row[col];
    return projected;
  });
  return { columns: options.columns, rows, grouped: false, total: rows.length };
}
