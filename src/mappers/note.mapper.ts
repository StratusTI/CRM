import type { Note } from "@prisma/client";
import type { NoteDTO } from "@/src/schemas/note.schema";

/** `Prisma.Note` → `NoteDTO` (datas em ISO). */
export function toNoteDTO(note: Note): NoteDTO {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    companyId: note.companyId,
    personId: note.personId,
    opportunityId: note.opportunityId,
    workspaceId: note.workspaceId,
    createdById: note.createdById,
    updatedById: note.updatedById,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    deletedAt: note.deletedAt === null ? null : note.deletedAt.toISOString(),
  };
}
