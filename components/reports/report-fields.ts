import type { ReportSource } from "@/src/schemas/report.schema";

/** Campos selecionáveis por fonte (rótulo + chave do DTO). */
export const REPORT_FIELDS: Record<
  ReportSource,
  { key: string; label: string }[]
> = {
  companies: [
    { key: "name", label: "Nome" },
    { key: "domain", label: "Domínio" },
    { key: "cnpj", label: "CNPJ" },
    { key: "employees", label: "Funcionários" },
    { key: "arr", label: "RRA" },
    { key: "icp", label: "PCI" },
    { key: "createdAt", label: "Criado em" },
  ],
  people: [
    { key: "name", label: "Nome" },
    { key: "emails", label: "E-mails" },
    { key: "phones", label: "Telefones" },
    { key: "city", label: "Cidade" },
    { key: "jobTitle", label: "Cargo" },
    { key: "createdAt", label: "Criado em" },
  ],
  opportunities: [
    { key: "name", label: "Nome" },
    { key: "amount", label: "Valor" },
    { key: "closeDate", label: "Fechamento" },
    { key: "source", label: "Origem" },
    { key: "createdAt", label: "Criado em" },
  ],
  leads: [
    { key: "name", label: "Nome" },
    { key: "emails", label: "E-mails" },
    { key: "company", label: "Empresa" },
    { key: "source", label: "Origem" },
    { key: "status", label: "Status" },
    { key: "score", label: "Score" },
    { key: "createdAt", label: "Criado em" },
  ],
  tasks: [
    { key: "title", label: "Título" },
    { key: "status", label: "Status" },
    { key: "dueDate", label: "Vencimento" },
    { key: "createdAt", label: "Criado em" },
  ],
  notes: [
    { key: "title", label: "Título" },
    { key: "createdAt", label: "Criado em" },
  ],
  products: [
    { key: "name", label: "Nome" },
    { key: "sku", label: "SKU" },
    { key: "unitPrice", label: "Preço" },
    { key: "billingType", label: "Cobrança" },
    { key: "active", label: "Ativo" },
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
