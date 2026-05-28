import type { EmailTemplate } from "@prisma/client";
import { emailTemplateNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toEmailTemplateDTO } from "@/src/mappers/email-template.mapper";
import { EmailTemplateRepository } from "@/src/repositories/email-template.repository";
import type {
  CreateEmailTemplateInput,
  EmailTemplateDTO,
  UpdateEmailTemplateInput,
} from "@/src/schemas/email-template.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<EmailTemplate>> {
  const found = await EmailTemplateRepository.findById(id);
  if (!found.ok) return found;
  const template = found.value;
  if (!template || template.workspaceId !== workspaceId || template.deletedAt) {
    return err(emailTemplateNotFound());
  }
  return ok(template);
}

export const EmailTemplateService = {
  async create(
    userId: string,
    slug: string,
    input: CreateEmailTemplateInput,
  ): Promise<Result<EmailTemplateDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const created = await EmailTemplateRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      subject: input.subject,
      contentHtml: input.contentHtml,
      contentJson: input.contentJson ?? null,
    });
    if (!created.ok) return created;
    return ok(toEmailTemplateDTO(created.value));
  },

  async list(
    userId: string,
    slug: string,
  ): Promise<Result<EmailTemplateDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await EmailTemplateRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toEmailTemplateDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<EmailTemplateDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const template = await loadInWorkspace(ws.value, id);
    if (!template.ok) return template;
    return ok(toEmailTemplateDTO(template.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateEmailTemplateInput,
  ): Promise<Result<EmailTemplateDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const updated = await EmailTemplateRepository.update(id, {
      updatedById: userId,
      ...input,
    });
    if (!updated.ok) return updated;
    return ok(toEmailTemplateDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<EmailTemplateDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await EmailTemplateRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toEmailTemplateDTO(removed.value));
  },
};
