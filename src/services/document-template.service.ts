import type { DocumentTemplate, DocumentType } from "@prisma/client";
import { documentTemplateNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toDocumentTemplateDTO } from "@/src/mappers/document-template.mapper";
import { DocumentTemplateRepository } from "@/src/repositories/document-template.repository";
import type {
  CreateDocumentTemplateInput,
  DocumentTemplateDTO,
} from "@/src/schemas/document-template.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<DocumentTemplate>> {
  const found = await DocumentTemplateRepository.findById(id);
  if (!found.ok) return found;
  const template = found.value;
  if (!template || template.workspaceId !== workspaceId || template.deletedAt) {
    return err(documentTemplateNotFound());
  }
  return ok(template);
}

export const DocumentTemplateService = {
  async create(
    userId: string,
    slug: string,
    input: CreateDocumentTemplateInput,
  ): Promise<Result<DocumentTemplateDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "documents",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    const created = await DocumentTemplateRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      title: input.title,
      content: input.content ?? "",
      type: input.type,
    });
    if (!created.ok) return created;
    return ok(toDocumentTemplateDTO(created.value));
  },

  async list(
    userId: string,
    slug: string,
    type?: DocumentType,
  ): Promise<Result<DocumentTemplateDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "documents",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const result = await DocumentTemplateRepository.listByWorkspace(
      ws.value,
      type,
    );
    if (!result.ok) return result;
    return ok(result.value.map(toDocumentTemplateDTO));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<DocumentTemplateDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "documents",
      action: "DELETE",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await DocumentTemplateRepository.softDelete(id);
    if (!removed.ok) return removed;
    return ok(toDocumentTemplateDTO(removed.value));
  },
};
