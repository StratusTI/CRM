import type { CustomFieldDefinition } from "@prisma/client";
import type { CustomFieldDTO } from "@/src/schemas/custom-field.schema";

/** `Prisma.CustomFieldDefinition` → `CustomFieldDTO`. */
export function toCustomFieldDTO(def: CustomFieldDefinition): CustomFieldDTO {
  return {
    id: def.id,
    entity: def.entity,
    key: def.key,
    label: def.label,
    type: def.type,
    options: def.options,
    required: def.required,
    position: def.position,
    workspaceId: def.workspaceId,
    createdById: def.createdById,
    updatedById: def.updatedById,
    createdAt: def.createdAt.toISOString(),
    updatedAt: def.updatedAt.toISOString(),
  };
}
