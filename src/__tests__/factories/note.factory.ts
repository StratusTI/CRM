import type { Note, Prisma } from "@prisma/client";

type NoteOverrides = Partial<
  Omit<Prisma.NoteCreateInput, "workspace" | "createdBy">
>;

/** Cria uma nota real no banco de testes, escopada a workspace + criador. */
export async function createNote(
  workspaceId: string,
  createdById: string,
  overrides: NoteOverrides = {},
): Promise<Note> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.note.create({
    data: {
      title: overrides.title ?? "Reunião",
      body: overrides.body ?? "anotação inicial",
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
