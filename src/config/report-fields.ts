import type { ReportSource } from "@/src/schemas/report.schema";

/**
 * Catálogo de campos das fontes de relatório (rótulos, tipos e relacionamentos).
 * Vive em `src/` para ser compartilhado entre engine/service e a UI; o caminho
 * antigo `@/components/reports/report-fields` re-exporta tudo.
 */

export type FieldType = "text" | "number" | "date";

export type ReportField = { key: string; label: string; type: FieldType };

/** Campos selecionáveis por fonte (rótulo + chave do DTO + tipo). */
export const REPORT_FIELDS: Record<ReportSource, ReportField[]> = {
  companies: [
    { key: "name", label: "Nome", type: "text" },
    { key: "domain", label: "Domínio", type: "text" },
    { key: "cnpj", label: "CNPJ", type: "text" },
    { key: "employees", label: "Funcionários", type: "number" },
    { key: "arr", label: "RRA", type: "number" },
    { key: "icp", label: "PCI", type: "text" },
    { key: "createdAt", label: "Criado em", type: "date" },
  ],
  people: [
    { key: "name", label: "Nome", type: "text" },
    { key: "emails", label: "E-mails", type: "text" },
    { key: "phones", label: "Telefones", type: "text" },
    { key: "city", label: "Cidade", type: "text" },
    { key: "jobTitle", label: "Cargo", type: "text" },
    { key: "createdAt", label: "Criado em", type: "date" },
  ],
  opportunities: [
    { key: "name", label: "Nome", type: "text" },
    { key: "amount", label: "Valor", type: "number" },
    { key: "closeDate", label: "Fechamento", type: "date" },
    { key: "source", label: "Origem", type: "text" },
    { key: "createdAt", label: "Criado em", type: "date" },
  ],
  leads: [
    { key: "name", label: "Nome", type: "text" },
    { key: "emails", label: "E-mails", type: "text" },
    { key: "company", label: "Empresa", type: "text" },
    { key: "source", label: "Origem", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "score", label: "Score", type: "number" },
    { key: "createdAt", label: "Criado em", type: "date" },
  ],
  tasks: [
    { key: "title", label: "Título", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "dueDate", label: "Vencimento", type: "date" },
    { key: "createdAt", label: "Criado em", type: "date" },
  ],
  notes: [
    { key: "title", label: "Título", type: "text" },
    { key: "createdAt", label: "Criado em", type: "date" },
  ],
  products: [
    { key: "name", label: "Nome", type: "text" },
    { key: "sku", label: "SKU", type: "text" },
    { key: "unitPrice", label: "Preço", type: "number" },
    { key: "billingType", label: "Cobrança", type: "text" },
    { key: "active", label: "Ativo", type: "text" },
  ],
};

export const SOURCE_LABELS: Record<ReportSource, string> = {
  companies: "Empresas",
  people: "Pessoas",
  opportunities: "Oportunidades",
  leads: "Leads",
  tasks: "Tarefas",
  notes: "Anotações",
  products: "Produtos",
};

/**
 * Relacionamentos joináveis por fonte: a chave estrangeira (`field`) aponta para
 * o `id` da fonte `to`. Alimenta a configuração de mesclagem (JOIN) no construtor.
 */
export type ReportRelation = {
  field: string;
  to: ReportSource;
  toField: string;
  label: string;
};

export const RELATIONS: Record<ReportSource, ReportRelation[]> = {
  companies: [],
  people: [
    { field: "companyId", to: "companies", toField: "id", label: "Empresa" },
  ],
  opportunities: [
    { field: "companyId", to: "companies", toField: "id", label: "Empresa" },
    {
      field: "pointOfContactId",
      to: "people",
      toField: "id",
      label: "Contato",
    },
  ],
  leads: [],
  tasks: [
    { field: "companyId", to: "companies", toField: "id", label: "Empresa" },
    { field: "personId", to: "people", toField: "id", label: "Pessoa" },
    {
      field: "opportunityId",
      to: "opportunities",
      toField: "id",
      label: "Oportunidade",
    },
  ],
  notes: [
    { field: "companyId", to: "companies", toField: "id", label: "Empresa" },
    { field: "personId", to: "people", toField: "id", label: "Pessoa" },
    {
      field: "opportunityId",
      to: "opportunities",
      toField: "id",
      label: "Oportunidade",
    },
  ],
  products: [],
};

/** Rótulo amigável de um campo (com fallback para a própria chave). */
export function fieldLabel(source: ReportSource, key: string): string {
  return REPORT_FIELDS[source].find((f) => f.key === key)?.label ?? key;
}

/** Tipo de um campo (default "text" quando não catalogado). */
export function fieldType(source: ReportSource, key: string): FieldType {
  return REPORT_FIELDS[source].find((f) => f.key === key)?.type ?? "text";
}
