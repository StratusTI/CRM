import type {
  Form,
  FormAction,
  FormStatus,
  FormSubmission,
  Prisma,
} from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";
import type { ActionConfig, FormFieldDef } from "@/src/schemas/form.schema";

export type CreateFormData = {
  workspaceId: string;
  createdById: string;
  name: string;
  description: string | null;
  action: FormAction;
  fields: FormFieldDef[];
  actionConfig: ActionConfig;
  successMessage: string | null;
  redirectUrl: string | null;
  publicToken: string;
};

export type UpdateFormData = {
  updatedById: string;
  name?: string;
  description?: string | null;
  status?: FormStatus;
  action?: FormAction;
  fields?: FormFieldDef[];
  actionConfig?: ActionConfig;
  successMessage?: string | null;
  redirectUrl?: string | null;
  publishedAt?: Date | null;
};

export type RecordSubmissionData = {
  formId: string;
  action: FormAction;
  values: Record<string, unknown>;
  createdPersonId: string | null;
  createdCompanyId: string | null;
  createdOpportunityId: string | null;
  personReused: boolean;
  ipHash: string | null;
  referrer: string | null;
};

/** Serializa um valor JS para input de coluna JSON do Prisma. */
function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/** Acesso a dados de formulário. Sem regra de negócio — só Prisma. */
export const FormRepository = {
  async create(data: CreateFormData): Promise<Result<Form>> {
    try {
      const form = await prisma.form.create({
        data: {
          workspaceId: data.workspaceId,
          createdById: data.createdById,
          name: data.name,
          description: data.description,
          action: data.action,
          fields: toJsonInput(data.fields),
          actionConfig: toJsonInput(data.actionConfig),
          successMessage: data.successMessage,
          redirectUrl: data.redirectUrl,
          publicToken: data.publicToken,
        },
      });
      return ok(form);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Form | null>> {
    try {
      const form = await prisma.form.findUnique({ where: { id } });
      return ok(form);
    } catch {
      return err(databaseError());
    }
  },

  /** Resolve o formulário pelo token público (ignora soft-deleted). */
  async findByPublicToken(token: string): Promise<Result<Form | null>> {
    try {
      const form = await prisma.form.findFirst({
        where: { publicToken: token, deletedAt: null },
      });
      return ok(form);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<Form[]>> {
    try {
      const forms = await prisma.form.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(forms);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.form.updateMany({
            where: { id, workspaceId, deletedAt: null },
            data: { position: index + 1 },
          }),
        ),
      );
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },

  async update(id: string, data: UpdateFormData): Promise<Result<Form>> {
    try {
      const { fields, actionConfig, ...rest } = data;
      const form = await prisma.form.update({
        where: { id },
        data: {
          ...rest,
          ...("fields" in data && fields !== undefined
            ? { fields: toJsonInput(fields) }
            : {}),
          ...("actionConfig" in data && actionConfig !== undefined
            ? { actionConfig: toJsonInput(actionConfig) }
            : {}),
        },
      });
      return ok(form);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Form>> {
    try {
      const form = await prisma.form.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(form);
    } catch {
      return err(databaseError());
    }
  },

  /** Registra uma submissão pública e incrementa o contador, atomicamente. */
  async recordSubmission(
    data: RecordSubmissionData,
  ): Promise<Result<FormSubmission>> {
    try {
      const [submission] = await prisma.$transaction([
        prisma.formSubmission.create({
          data: {
            formId: data.formId,
            action: data.action,
            values: toJsonInput(data.values),
            createdPersonId: data.createdPersonId,
            createdCompanyId: data.createdCompanyId,
            createdOpportunityId: data.createdOpportunityId,
            personReused: data.personReused,
            ipHash: data.ipHash,
            referrer: data.referrer,
          },
        }),
        prisma.form.update({
          where: { id: data.formId },
          data: { submissionCount: { increment: 1 } },
        }),
      ]);
      return ok(submission);
    } catch {
      return err(databaseError());
    }
  },

  async listSubmissions(
    formId: string,
    limit = 200,
  ): Promise<Result<FormSubmission[]>> {
    try {
      const submissions = await prisma.formSubmission.findMany({
        where: { formId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return ok(submissions);
    } catch {
      return err(databaseError());
    }
  },
};
