import type { EmailTemplate } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateEmailTemplateData = {
  workspaceId: string;
  createdById: string;
  name: string;
  subject: string;
  contentHtml: string;
  contentJson: string | null;
};

export type UpdateEmailTemplateData = {
  updatedById: string;
  name?: string;
  subject?: string;
  contentHtml?: string;
  contentJson?: string | null;
};

export const EmailTemplateRepository = {
  async create(data: CreateEmailTemplateData): Promise<Result<EmailTemplate>> {
    try {
      const template = await prisma.emailTemplate.create({ data });
      return ok(template);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<EmailTemplate | null>> {
    try {
      const template = await prisma.emailTemplate.findUnique({ where: { id } });
      return ok(template);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<EmailTemplate[]>> {
    try {
      const templates = await prisma.emailTemplate.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ createdAt: "desc" }],
      });
      return ok(templates);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    id: string,
    data: UpdateEmailTemplateData,
  ): Promise<Result<EmailTemplate>> {
    try {
      const template = await prisma.emailTemplate.update({
        where: { id },
        data,
      });
      return ok(template);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(
    id: string,
    updatedById: string,
  ): Promise<Result<EmailTemplate>> {
    try {
      const template = await prisma.emailTemplate.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(template);
    } catch {
      return err(databaseError());
    }
  },
};
