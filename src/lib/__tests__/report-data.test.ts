import { describe, expect, it } from "vitest";
import { type RowsByAlias, runQuery } from "@/src/lib/report-data";
import type { JoinQuery, UnionQuery } from "@/src/schemas/report.schema";

const opps = [
  {
    id: "o1",
    name: "Acme deal",
    source: "WhatsApp",
    amount: 100,
    companyId: "c1",
  },
  { id: "o2", name: "Beta deal", source: "Site", amount: 50, companyId: "c2" },
  {
    id: "o3",
    name: "Gama deal",
    source: "WhatsApp",
    amount: 200,
    companyId: "c1",
  },
  { id: "o4", name: "Orphan", source: "Site", amount: 10, companyId: "cX" },
];
const companies = [
  { id: "c1", name: "Acme" },
  { id: "c2", name: "Beta" },
];

function joinQuery(over: Partial<JoinQuery>): JoinQuery {
  return {
    mode: "join",
    datasets: [
      { alias: "opportunities", source: "opportunities", filters: [] },
    ],
    joins: [],
    columns: ["opportunities.name", "opportunities.amount"],
    ...over,
  };
}

describe("runQuery — fonte única (join, 1 dataset)", () => {
  const rows: RowsByAlias = { opportunities: opps };

  it("projeta colunas e aplica filtros do dataset", () => {
    const out = runQuery(
      joinQuery({
        datasets: [
          {
            alias: "opportunities",
            source: "opportunities",
            filters: [
              { field: "source", operator: "equals", value: "WhatsApp" },
            ],
          },
        ],
      }),
      rows,
    );
    expect(out.grouped).toBe(false);
    expect(out.total).toBe(2);
    expect(out.rows).toEqual([
      { "opportunities.name": "Acme deal", "opportunities.amount": 100 },
      { "opportunities.name": "Gama deal", "opportunities.amount": 200 },
    ]);
    // dataset único ⇒ rótulo sem prefixo de fonte
    expect(out.columns.map((c) => c.label)).toEqual(["Nome", "Valor"]);
  });

  it("ordena numericamente quando possível", () => {
    const out = runQuery(
      joinQuery({ sort: { field: "opportunities.amount", direction: "desc" } }),
      rows,
    );
    expect(out.rows.map((r) => r["opportunities.amount"])).toEqual([
      200, 100, 50, 10,
    ]);
  });
});

describe("runQuery — agrupamento e agregações", () => {
  it("agrupa por origem com count + sum + avg + min + max", () => {
    const out = runQuery(
      joinQuery({
        group: {
          by: ["opportunities.source"],
          aggregations: [
            { fn: "count", alias: "Qtd" },
            { fn: "sum", field: "opportunities.amount", alias: "Total" },
            { fn: "avg", field: "opportunities.amount", alias: "Media" },
            { fn: "min", field: "opportunities.amount", alias: "Min" },
            { fn: "max", field: "opportunities.amount", alias: "Max" },
          ],
        },
        sort: { field: "Total", direction: "desc" },
      }),
      { opportunities: opps },
    );
    expect(out.grouped).toBe(true);
    expect(out.total).toBe(4);
    expect(out.columns.map((c) => c.key)).toEqual([
      "opportunities.source",
      "Qtd",
      "Total",
      "Media",
      "Min",
      "Max",
    ]);
    const wpp = out.rows.find((r) => r["opportunities.source"] === "WhatsApp");
    expect(wpp).toMatchObject({
      Qtd: 2,
      Total: 300,
      Media: 150,
      Min: 100,
      Max: 200,
    });
    // ordenado por Total desc ⇒ WhatsApp (300) antes de Site (60)
    expect(out.rows[0]["opportunities.source"]).toBe("WhatsApp");
  });
});

describe("runQuery — JOIN entre fontes", () => {
  const rows: RowsByAlias = { opportunities: opps, companies };

  function withJoin(type: "inner" | "left"): JoinQuery {
    return joinQuery({
      datasets: [
        { alias: "opportunities", source: "opportunities", filters: [] },
        { alias: "companies", source: "companies", filters: [] },
      ],
      joins: [
        {
          leftAlias: "opportunities",
          rightAlias: "companies",
          leftField: "companyId",
          rightField: "id",
          type,
        },
      ],
      columns: ["opportunities.name", "companies.name"],
    });
  }

  it("inner join descarta linhas sem correspondência (fan-out 1:N)", () => {
    const out = runQuery(withJoin("inner"), rows);
    // o4 (cX) é descartado; o1,o3 → Acme, o2 → Beta
    expect(out.total).toBe(3);
    expect(out.rows).toContainEqual({
      "opportunities.name": "Acme deal",
      "companies.name": "Acme",
    });
    expect(out.rows.some((r) => r["opportunities.name"] === "Orphan")).toBe(
      false,
    );
    // múltiplos datasets ⇒ rótulo com prefixo de fonte
    expect(out.columns.map((c) => c.label)).toEqual([
      "Oportunidades · Nome",
      "Empresas · Nome",
    ]);
  });

  it("left join mantém base sem correspondência (campos do direito nulos)", () => {
    const out = runQuery(withJoin("left"), rows);
    expect(out.total).toBe(4);
    const orphan = out.rows.find((r) => r["opportunities.name"] === "Orphan");
    expect(orphan?.["companies.name"]).toBeUndefined();
  });
});

describe("runQuery — UNION entre fontes", () => {
  const leads = [{ id: "l1", name: "Maria", emails: "m@x.com" }];
  const people = [{ id: "p1", name: "João", emails: "j@y.com" }];
  const rows: RowsByAlias = { leads, people };

  function unionQuery(includeSource: boolean): UnionQuery {
    return {
      mode: "union",
      datasets: [
        { alias: "leads", source: "leads", filters: [] },
        { alias: "people", source: "people", filters: [] },
      ],
      columns: [
        {
          key: "nome",
          label: "Nome",
          fields: { leads: "name", people: "name" },
        },
        {
          key: "email",
          label: "E-mail",
          fields: { leads: "emails", people: "emails" },
        },
      ],
      includeSource,
    };
  }

  it("empilha registros mapeando colunas por dataset", () => {
    const out = runQuery(unionQuery(false), rows);
    expect(out.total).toBe(2);
    expect(out.columns.map((c) => c.key)).toEqual(["nome", "email"]);
    expect(out.rows).toEqual([
      { nome: "Maria", email: "m@x.com" },
      { nome: "João", email: "j@y.com" },
    ]);
  });

  it("inclui coluna de origem quando includeSource", () => {
    const out = runQuery(unionQuery(true), rows);
    expect(out.columns.map((c) => c.label)).toContain("Origem");
    expect(out.rows[0].__source).toBe("Leads");
    expect(out.rows[1].__source).toBe("Pessoas");
  });
});
