import type { DocumentTemplate, DocumentType } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateDocumentTemplateData = {
  workspaceId: string;
  createdById: string;
  title: string;
  content: string;
  type: DocumentType;
};

/** Acesso a dados de template de documento. Sem regra de negócio — só Prisma. */
export const DocumentTemplateRepository = {
  async create(
    data: CreateDocumentTemplateData,
  ): Promise<Result<DocumentTemplate>> {
    try {
      const template = await prisma.documentTemplate.create({ data });
      return ok(template);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<DocumentTemplate | null>> {
    try {
      const template = await prisma.documentTemplate.findUnique({
        where: { id },
      });
      return ok(template);
    } catch {
      return err(databaseError());
    }
  },

  /** Lista do workspace (ignora soft-deleted), opcionalmente filtrada por tipo. */
  async listByWorkspace(
    workspaceId: string,
    type?: DocumentType,
  ): Promise<Result<DocumentTemplate[]>> {
    try {
      const templates = await prisma.documentTemplate.findMany({
        where: { workspaceId, deletedAt: null, ...(type ? { type } : {}) },
        orderBy: { createdAt: "desc" },
      });
      return ok(templates);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string): Promise<Result<DocumentTemplate>> {
    try {
      const template = await prisma.documentTemplate.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return ok(template);
    } catch {
      return err(databaseError());
    }
  },
};
