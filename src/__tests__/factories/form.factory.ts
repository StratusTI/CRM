import { randomUUID } from "node:crypto";
import type { Form, Prisma } from "@prisma/client";
import type { FormFieldDef } from "@/src/schemas/form.schema";

type FormOverrides = Partial<
  Omit<Prisma.FormCreateInput, "workspace" | "createdBy">
>;

/** Conjunto de campos válido para um formulário de LEAD publicável. */
export const LEAD_FIELDS: FormFieldDef[] = [
  {
    key: "nome",
    label: "Nome",
    type: "text",
    required: true,
    mapping: { target: "person", attribute: "name" },
  },
  {
    key: "email",
    label: "E-mail",
    type: "email",
    required: false,
    mapping: { target: "person", attribute: "email" },
  },
];

/** Cria um formulário real no banco de testes, escopado a workspace + criador. */
export async function createForm(
  workspaceId: string,
  createdById: string,
  overrides: FormOverrides = {},
): Promise<Form> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.form.create({
    data: {
      name: overrides.name ?? "Formulário de contato",
      publicToken: overrides.publicToken ?? randomUUID().replace(/-/g, ""),
      action: overrides.action ?? "LEAD",
      fields: (overrides.fields ?? LEAD_FIELDS) as Prisma.InputJsonValue,
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
