import type { Form, FormSubmission } from "@prisma/client";
import { NEXT_PUBLIC_URL } from "@/lib/env/env";
import type { WorkspaceSubmission } from "@/src/repositories/form.repository";
import type {
  ActionConfig,
  FormDTO,
  FormFieldDef,
  PublicFormDTO,
} from "@/src/schemas/form.schema";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** URL pública absoluta do formulário (origin + basePath + `/f/<token>`). */
export function publicFormUrl(publicToken: string): string {
  const origin = (NEXT_PUBLIC_URL ?? "").replace(/\/$/, "");
  return `${origin}${BASE_PATH}/f/${publicToken}`;
}

function fieldsOf(form: Form): FormFieldDef[] {
  return (form.fields as unknown as FormFieldDef[] | null) ?? [];
}

function actionConfigOf(form: Form): ActionConfig {
  return (form.actionConfig as unknown as ActionConfig | null) ?? {};
}

/** `Prisma.Form` → `FormDTO` (datas em ISO, `publicUrl` computado). */
export function toFormDTO(form: Form): FormDTO {
  return {
    id: form.id,
    name: form.name,
    description: form.description,
    status: form.status,
    action: form.action,
    publicToken: form.publicToken,
    publicUrl: publicFormUrl(form.publicToken),
    fields: fieldsOf(form),
    actionConfig: actionConfigOf(form),
    successMessage: form.successMessage,
    redirectUrl: form.redirectUrl,
    submissionCount: form.submissionCount,
    publishedAt:
      form.publishedAt === null ? null : form.publishedAt.toISOString(),
    workspaceId: form.workspaceId,
    createdById: form.createdById,
    updatedById: form.updatedById,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
    deletedAt: form.deletedAt === null ? null : form.deletedAt.toISOString(),
  };
}

/** Só o necessário para a página pública (sem `mapping` nem campos internos). */
export function toPublicFormDTO(form: Form): PublicFormDTO {
  return {
    id: form.id,
    name: form.name,
    description: form.description,
    fields: fieldsOf(form).map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder,
      options: field.options,
    })),
    successMessage: form.successMessage,
  };
}

export type FormSubmissionDTO = {
  id: string;
  formId: string;
  action: FormSubmission["action"];
  values: Record<string, unknown>;
  createdPersonId: string | null;
  createdCompanyId: string | null;
  createdOpportunityId: string | null;
  personReused: boolean;
  referrer: string | null;
  createdAt: string;
};

/**
 * Linha plana de submissão para os dashboards (1 por resposta), com o nome do
 * formulário desnormalizado para agrupar gráficos. `createdAt` em ISO permite o
 * motor de chart bucketizar por dia.
 */
export type FormSubmissionRow = {
  id: string;
  form: string;
  action: FormSubmission["action"];
  personReused: boolean;
  referrer: string | null;
  createdAt: string;
};

export function toFormSubmissionRow(
  submission: WorkspaceSubmission,
): FormSubmissionRow {
  return {
    id: submission.id,
    form: submission.form.name,
    action: submission.action,
    personReused: submission.personReused,
    referrer: submission.referrer,
    createdAt: submission.createdAt.toISOString(),
  };
}

export function toFormSubmissionDTO(
  submission: FormSubmission,
): FormSubmissionDTO {
  return {
    id: submission.id,
    formId: submission.formId,
    action: submission.action,
    values: (submission.values as Record<string, unknown> | null) ?? {},
    createdPersonId: submission.createdPersonId,
    createdCompanyId: submission.createdCompanyId,
    createdOpportunityId: submission.createdOpportunityId,
    personReused: submission.personReused,
    referrer: submission.referrer,
    createdAt: submission.createdAt.toISOString(),
  };
}
