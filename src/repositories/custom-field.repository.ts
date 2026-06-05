import type { CustomFieldDefinition, CustomFieldEntity } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateCustomFieldData = {
  workspaceId: string;
  createdById: string;
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: CustomFieldDefinition["type"];
  options: string[];
  required: boolean;
};

export type UpdateCustomFieldData = {
  updatedById: string;
  label?: string;
  options?: string[];
  required?: boolean;
};

/** Acesso a dados das definições de campos customizados. Sem regra — só Prisma. */
export const CustomFieldRepository = {
  async create(
    data: CreateCustomFieldData,
  ): Promise<Result<CustomFieldDefinition>> {
    try {
      const last = await prisma.customFieldDefinition.findFirst({
        where: {
          workspaceId: data.workspaceId,
          entity: data.entity,
          deletedAt: null,
        },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const { workspaceId, createdById, ...fields } = data;
      const def = await prisma.customFieldDefinition.create({
        data: {
          ...fields,
          workspaceId,
          createdById,
          position: (last?.position ?? 0) + 1,
        },
      });
      return ok(def);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<CustomFieldDefinition | null>> {
    try {
      const def = await prisma.customFieldDefinition.findUnique({
        where: { id },
      });
      return ok(def);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
    entity?: CustomFieldEntity,
  ): Promise<Result<CustomFieldDefinition[]>> {
    try {
      const defs = await prisma.customFieldDefinition.findMany({
        where: { workspaceId, deletedAt: null, ...(entity && { entity }) },
        orderBy: [{ entity: "asc" }, { position: "asc" }],
      });
      return ok(defs);
    } catch {
      return err(databaseError());
    }
  },

  /** Definições vivas de uma entidade (para validar valores recebidos). */
  async listForEntity(
    workspaceId: string,
    entity: CustomFieldEntity,
  ): Promise<Result<CustomFieldDefinition[]>> {
    return CustomFieldRepository.listByWorkspace(workspaceId, entity);
  },

  async existsByKey(
    workspaceId: string,
    entity: CustomFieldEntity,
    key: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.customFieldDefinition.count({
        where: { workspaceId, entity, key, deletedAt: null },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    id: string,
    data: UpdateCustomFieldData,
  ): Promise<Result<CustomFieldDefinition>> {
    try {
      const def = await prisma.customFieldDefinition.update({
        where: { id },
        data,
      });
      return ok(def);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(
    workspaceId: string,
    entity: CustomFieldEntity,
    ids: string[],
  ): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.customFieldDefinition.updateMany({
            where: { id, workspaceId, entity, deletedAt: null },
            data: { position: index + 1 },
          }),
        ),
      );
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(
    id: string,
    updatedById: string,
  ): Promise<Result<CustomFieldDefinition>> {
    try {
      const def = await prisma.customFieldDefinition.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(def);
    } catch {
      return err(databaseError());
    }
  },
};
