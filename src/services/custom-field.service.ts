import type { CustomFieldDefinition, CustomFieldEntity } from "@prisma/client";
import {
  customFieldKeyTaken,
  customFieldNotFound,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toCustomFieldDTO } from "@/src/mappers/custom-field.mapper";
import {
  CustomFieldRepository,
  type UpdateCustomFieldData,
} from "@/src/repositories/custom-field.repository";
import type {
  CreateCustomFieldInput,
  CustomFieldDTO,
  UpdateCustomFieldInput,
} from "@/src/schemas/custom-field.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<CustomFieldDefinition>> {
  const found = await CustomFieldRepository.findById(id);
  if (!found.ok) return found;
  const def = found.value;
  if (!def || def.workspaceId !== workspaceId || def.deletedAt) {
    return err(customFieldNotFound());
  }
  return ok(def);
}

export const CustomFieldService = {
  async list(
    userId: string,
    slug: string,
    entity?: CustomFieldEntity,
  ): Promise<Result<CustomFieldDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "custom-fields",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const result = await CustomFieldRepository.listByWorkspace(
      ws.value,
      entity,
    );
    if (!result.ok) return result;
    return ok(result.value.map(toCustomFieldDTO));
  },

  async create(
    userId: string,
    slug: string,
    input: CreateCustomFieldInput,
  ): Promise<Result<CustomFieldDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "custom-fields",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    const taken = await CustomFieldRepository.existsByKey(
      ws.value,
      input.entity,
      input.key,
    );
    if (!taken.ok) return taken;
    if (taken.value) return err(customFieldKeyTaken());

    const created = await CustomFieldRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      entity: input.entity,
      key: input.key,
      label: input.label,
      type: input.type,
      options: input.options,
      required: input.required,
    });
    if (!created.ok) return created;
    return ok(toCustomFieldDTO(created.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateCustomFieldInput,
  ): Promise<Result<CustomFieldDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "custom-fields",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const data: UpdateCustomFieldData = { updatedById: userId, ...input };
    const updated = await CustomFieldRepository.update(id, data);
    if (!updated.ok) return updated;
    return ok(toCustomFieldDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<CustomFieldDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "custom-fields",
      action: "DELETE",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await CustomFieldRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toCustomFieldDTO(removed.value));
  },

  async reorder(
    userId: string,
    slug: string,
    entity: CustomFieldEntity,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "custom-fields",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    return CustomFieldRepository.reorder(ws.value, entity, ids);
  },
};
