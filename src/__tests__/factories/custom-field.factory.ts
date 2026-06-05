import type {
  CustomFieldDefinition,
  CustomFieldEntity,
  CustomFieldType,
} from "@prisma/client";

type FieldOverrides = {
  entity?: CustomFieldEntity;
  key?: string;
  label?: string;
  type?: CustomFieldType;
  options?: string[];
  required?: boolean;
};

/** Cria uma definição de campo customizado no banco de testes. */
export async function createCustomFieldDef(
  workspaceId: string,
  createdById: string,
  overrides: FieldOverrides = {},
): Promise<CustomFieldDefinition> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.customFieldDefinition.create({
    data: {
      entity: overrides.entity ?? "COMPANY",
      key: overrides.key ?? "segmento",
      label: overrides.label ?? "Segmento",
      type: overrides.type ?? "TEXT",
      options: overrides.options ?? [],
      required: overrides.required ?? false,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
