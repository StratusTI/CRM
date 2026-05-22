import type { Person, Prisma } from "@prisma/client";

type PersonOverrides = Partial<
  Omit<Prisma.PersonCreateInput, "workspace" | "createdBy">
>;

/** Cria uma pessoa real no banco de testes, escopada a workspace + criador. */
export async function createPerson(
  workspaceId: string,
  createdById: string,
  overrides: PersonOverrides = {},
): Promise<Person> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.person.create({
    data: {
      name: overrides.name ?? "Ada Lovelace",
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
