import { randomBytes } from "node:crypto";
import type { Form } from "@prisma/client";
import {
  formFieldInvalid,
  formNotFound,
  formNotPublished,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import {
  type FormSubmissionDTO,
  toFormDTO,
  toFormSubmissionDTO,
  toPublicFormDTO,
} from "@/src/mappers/form.mapper";
import {
  FormRepository,
  type UpdateFormData,
} from "@/src/repositories/form.repository";
import {
  type CreateFormInput,
  type FormActionType,
  type FormDTO,
  type FormFieldDef,
  type PublicFormDTO,
  type UpdateFormInput,
  validateFieldsForAction,
} from "@/src/schemas/form.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Token opaco do link público — emitido no servidor, estável por formulário. */
function makePublicToken(): string {
  return randomBytes(16).toString("hex");
}

function fieldsOf(form: Form): FormFieldDef[] {
  return (form.fields as unknown as FormFieldDef[] | null) ?? [];
}

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Form>> {
  const found = await FormRepository.findById(id);
  if (!found.ok) return found;
  const form = found.value;
  if (!form || form.workspaceId !== workspaceId || form.deletedAt) {
    return err(formNotFound());
  }
  return ok(form);
}

export const FormService = {
  async create(
    userId: string,
    slug: string,
    input: CreateFormInput,
  ): Promise<Result<FormDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const action = input.action as FormActionType;
    const fields = input.fields ?? [];
    // Compatibilidade destino↔ação já no rascunho; mapeamentos mínimos só ao publicar.
    const invalid = validateFieldsForAction(action, fields, false);
    if (invalid) return err(formFieldInvalid(invalid));

    const created = await FormRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      description: input.description ?? null,
      action,
      fields,
      actionConfig: input.actionConfig ?? {},
      successMessage: input.successMessage ?? null,
      redirectUrl: input.redirectUrl ?? null,
      publicToken: makePublicToken(),
    });
    if (!created.ok) return created;
    return ok(toFormDTO(created.value));
  },

  async list(userId: string, slug: string): Promise<Result<FormDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await FormRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toFormDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<FormDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const form = await loadInWorkspace(ws.value, id);
    if (!form.ok) return form;
    return ok(toFormDTO(form.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateFormInput,
  ): Promise<Result<FormDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const resolvedAction = (input.action ??
      existing.value.action) as FormActionType;
    const resolvedFields = input.fields ?? fieldsOf(existing.value);
    const resolvedStatus = input.status ?? existing.value.status;

    // Ao publicar exigimos os mapeamentos mínimos; em rascunho só a compatibilidade.
    const invalid = validateFieldsForAction(
      resolvedAction,
      resolvedFields,
      resolvedStatus === "PUBLISHED",
    );
    if (invalid) return err(formFieldInvalid(invalid));

    const data: UpdateFormData = { updatedById: userId, ...input };
    // Carimba o 1º publish; despublicar não apaga o timestamp original.
    if (input.status === "PUBLISHED" && !existing.value.publishedAt) {
      data.publishedAt = new Date();
    }

    const updated = await FormRepository.update(id, data);
    if (!updated.ok) return updated;
    return ok(toFormDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<FormDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await FormRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toFormDTO(removed.value));
  },

  /** Persiste a ordem manual dos formulários (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    return FormRepository.reorder(ws.value, ids);
  },

  async listSubmissions(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<FormSubmissionDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const form = await loadInWorkspace(ws.value, id);
    if (!form.ok) return form;

    const submissions = await FormRepository.listSubmissions(id);
    if (!submissions.ok) return submissions;
    return ok(submissions.value.map(toFormSubmissionDTO));
  },

  /* --------------------------- público (sem auth) ------------------------ */

  /** Resolve o formulário pelo token público — só se estiver PUBLISHED. */
  async getPublicByToken(token: string): Promise<Result<PublicFormDTO>> {
    const found = await FormRepository.findByPublicToken(token);
    if (!found.ok) return found;
    if (!found.value) return err(formNotFound());
    if (found.value.status !== "PUBLISHED") return err(formNotPublished());
    return ok(toPublicFormDTO(found.value));
  },
};
