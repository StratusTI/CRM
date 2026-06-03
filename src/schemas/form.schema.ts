import { z } from "zod";
import { OPPORTUNITY_STAGES } from "@/src/schemas/opportunity.schema";
import { normalizedUrl } from "@/src/schemas/shared";

/**
 * Contrato da feature Formulários.
 *
 * Um Form é um formulário de captação 100% customizável (o usuário escolhe os
 * `fields`), com visual travado no padrão do sistema. No envio ele executa uma
 * `action` que escreve no CRM: cria uma empresa (COMPANY), uma pessoa (PERSON)
 * ou um lead (LEAD = pessoa + oportunidade, reusando a ingestão de leads).
 *
 * `status` PUBLISHED = online: o `publicToken` opaco serve a página pública
 * (`/f/<token>`) sem auth. Cada campo é vinculado (`mapping`) a um atributo de
 * uma entidade alvo, restrito a uma allowlist — nunca expomos colunas
 * arbitrárias do banco.
 */

export const FORM_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type FormStatusType = (typeof FORM_STATUSES)[number];

export const FORM_ACTIONS = ["COMPANY", "PERSON", "LEAD"] as const;
export type FormActionType = (typeof FORM_ACTIONS)[number];

export const FORM_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "number",
  "textarea",
  "select",
  "checkbox",
  "url",
  "date",
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FIELD_TARGETS = ["person", "company", "opportunity"] as const;
export type FieldTarget = (typeof FIELD_TARGETS)[number];

/**
 * Atributos que um campo pode preencher, por entidade alvo. Derivado dos
 * contratos de create de cada entidade — qualquer atributo fora desta lista é
 * rejeitado na validação.
 */
export const TARGET_ATTRIBUTES = {
  person: ["name", "email", "phone", "city", "jobTitle", "linkedin", "avatar"],
  company: ["name", "cnpj", "domain", "employees", "linkedin", "arr"],
  opportunity: ["name", "amount", "source", "stage", "closeDate"],
} as const satisfies Record<FieldTarget, readonly string[]>;

/** Destinos permitidos por ação (a oportunidade só existe no LEAD). */
export const ACTION_TARGETS = {
  COMPANY: ["company"],
  PERSON: ["person"],
  LEAD: ["person", "opportunity"],
} as const satisfies Record<FormActionType, readonly FieldTarget[]>;

const OptionSchema = z.object({
  label: z.string().trim().min(1, "Rótulo da opção obrigatório").max(120),
  value: z.string().trim().min(1, "Valor da opção obrigatório").max(120),
});

const MappingSchema = z
  .object({
    target: z.enum(FIELD_TARGETS),
    attribute: z.string().trim().min(1),
  })
  .refine(
    (m) =>
      (TARGET_ATTRIBUTES[m.target] as readonly string[]).includes(m.attribute),
    { message: "Atributo inválido para o destino selecionado" },
  );

/** Uma definição de campo do formulário (um item de `fields`). */
export const FormFieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[a-z][a-z0-9_]*$/, "Use apenas letras minúsculas, números e _"),
    label: z.string().trim().min(1, "Informe o rótulo do campo").max(120),
    type: z.enum(FORM_FIELD_TYPES),
    required: z.boolean().optional().default(false),
    placeholder: z.string().trim().max(200).optional(),
    options: z.array(OptionSchema).max(50).optional(),
    mapping: MappingSchema,
  })
  .superRefine((field, ctx) => {
    if (field.type === "select" && (field.options?.length ?? 0) === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Campos de seleção exigem ao menos uma opção",
      });
    }
  });

/** Lista de campos: estrutura de cada campo + chaves únicas. */
export const FormFieldsSchema = z
  .array(FormFieldSchema)
  .max(50, "No máximo 50 campos")
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    fields.forEach((field, index) => {
      if (seen.has(field.key)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "key"],
          message: `Chave duplicada: "${field.key}"`,
        });
      }
      seen.add(field.key);
    });
  });

/** Defaults aplicados pela ação no envio (ex.: origem/estágio da oportunidade). */
export const ActionConfigSchema = z.object({
  opportunitySource: z.string().trim().max(60).optional(),
  opportunityStage: z.enum(OPPORTUNITY_STAGES).optional(),
  opportunityName: z.string().trim().max(200).optional(),
  icp: z.boolean().optional(),
});

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do formulário")
  .max(200, "Nome muito longo");
const DescriptionSchema = z.string().trim().max(2000, "Descrição muito longa");
const SuccessMessageSchema = z.string().trim().max(2000);
const RedirectUrlSchema = normalizedUrl(
  "URL de redirecionamento inválida",
  1000,
);

export const CreateFormSchema = z.object({
  name: NameSchema,
  description: DescriptionSchema.optional(),
  action: z.enum(FORM_ACTIONS).optional().default("LEAD"),
  fields: FormFieldsSchema.optional().default([]),
  actionConfig: ActionConfigSchema.optional(),
  successMessage: SuccessMessageSchema.optional(),
  redirectUrl: RedirectUrlSchema.optional(),
});

/**
 * Atualização parcial. `status` alterna online/offline; campos opcionais
 * aceitam `null` para limpar. A validação de "campos compatíveis com a ação"
 * (e a exigência de mapeamentos mínimos ao publicar) acontece no serviço, que
 * tem acesso ao estado final mesclado.
 */
export const UpdateFormSchema = z
  .object({
    name: NameSchema,
    description: DescriptionSchema.nullable(),
    status: z.enum(FORM_STATUSES),
    action: z.enum(FORM_ACTIONS),
    fields: FormFieldsSchema,
    actionConfig: ActionConfigSchema,
    successMessage: SuccessMessageSchema.nullable(),
    redirectUrl: RedirectUrlSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const FormOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(FORM_STATUSES),
  action: z.enum(FORM_ACTIONS),
  publicToken: z.string(),
  publicUrl: z.string(),
  fields: z.array(FormFieldSchema),
  actionConfig: ActionConfigSchema,
  successMessage: z.string().nullable(),
  redirectUrl: z.string().nullable(),
  submissionCount: z.number().int(),
  publishedAt: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

/** Campo exposto na página pública — sem o `mapping` (detalhe interno). */
export const PublicFormFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(FORM_FIELD_TYPES),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(OptionSchema).optional(),
});

/** O que a página pública precisa — sem campos/contexto internos. */
export const PublicFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  fields: z.array(PublicFormFieldSchema),
  successMessage: z.string().nullable(),
});

/**
 * Entrada da submissão pública. `_hp` é o honeypot anti-spam (deve vir vazio).
 * A validação real por-campo é construída dinamicamente em `buildSubmissionSchema`.
 */
export const FormSubmissionInputSchema = z.object({
  values: z.record(z.string(), z.unknown()).optional().default({}),
  _hp: z.string().optional(),
});

export type FormFieldDef = z.infer<typeof FormFieldSchema>;
export type FormFieldOption = z.infer<typeof OptionSchema>;
export type ActionConfig = z.infer<typeof ActionConfigSchema>;
export type CreateFormInput = z.infer<typeof CreateFormSchema>;
export type UpdateFormInput = z.infer<typeof UpdateFormSchema>;
export type FormDTO = z.infer<typeof FormOutputSchema>;
export type PublicFormDTO = z.infer<typeof PublicFormSchema>;
export type PublicFormField = z.infer<typeof PublicFormFieldSchema>;
export type FormSubmissionInput = z.infer<typeof FormSubmissionInputSchema>;

/**
 * Valida que os campos são compatíveis com a ação. Destinos fora da allowlist
 * da ação são sempre inválidos; os mapeamentos mínimos (nome, e-mail/telefone)
 * só são exigidos quando `requireComplete` (i.e. ao publicar). Retorna a
 * mensagem de erro ou `null` se válido.
 */
export function validateFieldsForAction(
  action: FormActionType,
  fields: FormFieldDef[],
  requireComplete: boolean,
): string | null {
  const allowed = ACTION_TARGETS[action] as readonly FieldTarget[];
  for (const field of fields) {
    if (!allowed.includes(field.mapping.target)) {
      return `O campo "${field.label}" aponta para um destino inválido para a ação selecionada.`;
    }
  }
  if (!requireComplete) return null;

  const has = (target: FieldTarget, attribute: string) =>
    fields.some(
      (f) => f.mapping.target === target && f.mapping.attribute === attribute,
    );
  // O campo de nome precisa ser obrigatório — garante que o registro criado
  // nunca nasça sem nome a partir de uma submissão pública.
  const hasRequired = (target: FieldTarget, attribute: string) =>
    fields.some(
      (f) =>
        f.mapping.target === target &&
        f.mapping.attribute === attribute &&
        f.required,
    );

  if (action === "COMPANY" && !hasRequired("company", "name")) {
    return "Marque como obrigatório um campo mapeado para Empresa → nome antes de publicar.";
  }
  if (action === "PERSON" && !hasRequired("person", "name")) {
    return "Marque como obrigatório um campo mapeado para Pessoa → nome antes de publicar.";
  }
  if (action === "LEAD") {
    if (!hasRequired("person", "name")) {
      return "Marque como obrigatório um campo mapeado para Pessoa → nome antes de publicar.";
    }
    if (!has("person", "email") && !has("person", "phone")) {
      return "Mapeie um campo para Pessoa → e-mail ou telefone (necessário para deduplicação) antes de publicar.";
    }
  }
  return null;
}

/** Validador base de um campo conforme o tipo escolhido. */
function fieldValidator(field: FormFieldDef): z.ZodType {
  switch (field.type) {
    case "email":
      return z.email("E-mail inválido").max(320);
    case "url":
      return normalizedUrl("URL inválida", 1000);
    case "number":
      return z.coerce
        .number<number>()
        .refine(Number.isFinite, "Número inválido");
    case "checkbox":
      return z.preprocess(
        (v) => v === true || v === "true" || v === "on" || v === 1 || v === "1",
        z.boolean(),
      );
    case "select": {
      const values = (field.options ?? []).map((o) => o.value);
      return values.length
        ? z.enum(values as [string, ...string[]])
        : z.string();
    }
    case "date":
      return z.iso.date("Data inválida");
    case "phone":
      return z.string().trim().max(40, "Telefone muito longo");
    default:
      return z.string().trim().max(5000, "Texto muito longo");
  }
}

/**
 * Constrói dinamicamente o schema de validação de uma submissão a partir das
 * definições de campo do formulário. Campos não obrigatórios viram opcionais.
 */
export function buildSubmissionSchema(
  fields: FormFieldDef[],
): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    let base = fieldValidator(field);
    if (
      field.required &&
      (field.type === "text" ||
        field.type === "textarea" ||
        field.type === "phone")
    ) {
      base = (base as z.ZodString).min(1, "Campo obrigatório");
    }
    // Trata string vazia como ausente: campos opcionais em branco não falham
    // (e-mail/número/data vazios), e obrigatórios em branco caem como faltantes.
    const inner = field.required ? base : base.optional();
    shape[field.key] = z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      inner,
    );
  }
  return z.object(shape) as z.ZodType<Record<string, unknown>>;
}
