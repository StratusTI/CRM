import type { Lead, LeadRuleField, LeadRuleOperator } from "@prisma/client";

/**
 * Avaliação de condições das regras de lead (scoring/roteamento). Compartilhado
 * pelos dois motores para garantir semântica idêntica.
 */

/** Valores textuais de um campo do lead (email/phone são listas). */
export function fieldValues(
  lead: Pick<
    Lead,
    "name" | "emails" | "phones" | "company" | "jobTitle" | "source" | "city"
  >,
  field: LeadRuleField,
): string[] {
  switch (field) {
    case "email":
      return lead.emails;
    case "phone":
      return lead.phones;
    case "name":
      return lead.name ? [lead.name] : [];
    case "company":
      return lead.company ? [lead.company] : [];
    case "jobTitle":
      return lead.jobTitle ? [lead.jobTitle] : [];
    case "source":
      return lead.source ? [lead.source] : [];
    case "city":
      return lead.city ? [lead.city] : [];
    default:
      return [];
  }
}

/** A condição `field operator value` é satisfeita pelo lead? */
export function matchesCondition(
  lead: Parameters<typeof fieldValues>[0],
  field: LeadRuleField,
  operator: LeadRuleOperator,
  value: string | null,
): boolean {
  const values = fieldValues(lead, field).filter((v) => v.length > 0);
  const needle = (value ?? "").trim().toLowerCase();

  switch (operator) {
    case "is_empty":
      return values.length === 0;
    case "is_not_empty":
      return values.length > 0;
    case "equals":
      return needle !== "" && values.some((v) => v.toLowerCase() === needle);
    case "not_equals":
      return needle !== "" && !values.some((v) => v.toLowerCase() === needle);
    case "contains":
      return (
        needle !== "" && values.some((v) => v.toLowerCase().includes(needle))
      );
    default:
      return false;
  }
}
