import {
  type FieldType,
  RELATIONS,
  REPORT_FIELDS,
  SOURCE_LABELS,
} from "@/src/config/report-fields";
import type {
  JoinQuery,
  ReportQuery,
  ReportSource,
  UnionQuery,
} from "@/src/schemas/report.schema";

/** Coluna candidata (campo de uma fonte ou coluna de saída), com rótulo e tipo. */
export type OutField = { key: string; label: string; type: FieldType };

/** Gera um alias único para uma fonte dentro da query. */
export function makeAlias(source: ReportSource, taken: Set<string>): string {
  let alias: string = source;
  let i = 1;
  while (taken.has(alias)) {
    i += 1;
    alias = `${source}_${i}`;
  }
  return alias;
}

/** Campos namespaced de todos os datasets de um JOIN (com rótulo amigável). */
export function joinFields(q: JoinQuery): OutField[] {
  const multi = q.datasets.length > 1;
  return q.datasets.flatMap((ds) =>
    REPORT_FIELDS[ds.source].map((f) => ({
      key: `${ds.alias}.${f.key}`,
      label: multi ? `${SOURCE_LABELS[ds.source]} · ${f.label}` : f.label,
      type: f.type,
    })),
  );
}

/** Colunas de saída de um UNION (colunas mapeadas + origem opcional). */
export function unionFields(q: UnionQuery): OutField[] {
  const cols: OutField[] = q.columns.map((c) => ({
    key: c.key,
    label: c.label,
    type: "text",
  }));
  if (q.includeSource)
    cols.push({ key: "__source", label: "Origem", type: "text" });
  return cols;
}

/** Campos candidatos a coluna/agrupamento/ordenação conforme o modo. */
export function queryFields(query: ReportQuery): OutField[] {
  return query.mode === "join" ? joinFields(query) : unionFields(query);
}

/** Colunas finais de saída (já considera agrupamento). Usado p/ ordenação. */
export function outputColumns(query: ReportQuery): OutField[] {
  const fields = queryFields(query);
  if (!query.group) {
    if (query.mode === "join") {
      return query.columns
        .map((key) => fields.find((f) => f.key === key))
        .filter((f): f is OutField => Boolean(f));
    }
    return fields;
  }
  const byCols = query.group.by
    .map((key) => fields.find((f) => f.key === key))
    .filter((f): f is OutField => Boolean(f));
  const aggCols: OutField[] = query.group.aggregations.map((a) => ({
    key: a.alias,
    label: a.alias,
    type: "number",
  }));
  return [...byCols, ...aggCols];
}

/** Relações disponíveis para mesclar (a partir dos datasets já presentes). */
export type AvailableRelation = {
  fromAlias: string;
  field: string;
  to: ReportSource;
  toField: string;
  label: string;
};

export function availableRelations(q: JoinQuery): AvailableRelation[] {
  return q.datasets.flatMap((ds) =>
    RELATIONS[ds.source].map((rel) => ({
      fromAlias: ds.alias,
      field: rel.field,
      to: rel.to,
      toField: rel.toField,
      label: `${rel.label} (de ${SOURCE_LABELS[ds.source]})`,
    })),
  );
}

/**
 * Remove referências quebradas (colunas/agrupamento/ordenação que apontam para
 * campos inexistentes) após mudanças estruturais — mantém a query sempre válida.
 */
export function reconcile(query: ReportQuery): ReportQuery {
  const fieldKeys = new Set(queryFields(query).map((f) => f.key));

  let group = query.group;
  if (group) {
    const by = group.by.filter((k) => fieldKeys.has(k));
    const aggregations = group.aggregations.filter(
      (a) => a.fn === "count" || (a.field ? fieldKeys.has(a.field) : false),
    );
    group =
      by.length > 0 && aggregations.length > 0
        ? { by, aggregations }
        : undefined;
  }

  const base = { ...query, group } as ReportQuery;

  // chaves válidas para ordenação dependem do agrupamento
  const sortable = new Set(outputColumns(base).map((f) => f.key));
  const sort =
    query.sort && sortable.has(query.sort.field) ? query.sort : undefined;

  if (base.mode === "join") {
    return {
      ...base,
      columns: base.columns.filter((c) => fieldKeys.has(c)),
      sort,
    };
  }
  return { ...base, sort };
}
