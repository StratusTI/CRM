import type { Note } from "@prisma/client";
import { noteNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toNoteDTO } from "@/src/mappers/note.mapper";
import { NoteRepository } from "@/src/repositories/note.repository";
import type {
  CreateNoteInput,
  NoteDTO,
  UpdateNoteInput,
} from "@/src/schemas/note.schema";
import { assertRelationRefs } from "@/src/services/relation-refs";
import { dispatchRecordEvent } from "@/src/services/workflow-dispatcher";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Note>> {
  const found = await NoteRepository.findById(id);
  if (!found.ok) return found;
  const note = found.value;
  if (!note || note.workspaceId !== workspaceId || note.deletedAt) {
    return err(noteNotFound());
  }
  return ok(note);
}

export const NoteService = {
  async create(
    userId: string,
    slug: string,
    input: CreateNoteInput,
  ): Promise<Result<NoteDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const refs = await assertRelationRefs(ws.value, input);
    if (!refs.ok) return refs;

    const created = await NoteRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      title: input.title ?? null,
      body: input.body ?? null,
      companyId: input.companyId ?? null,
      personId: input.personId ?? null,
      opportunityId: input.opportunityId ?? null,
    });
    if (!created.ok) return created;
    const dto = toNoteDTO(created.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "note",
      event: "created",
      record: dto,
    });
    return ok(dto);
  },

  async list(userId: string, slug: string): Promise<Result<NoteDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await NoteRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toNoteDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<NoteDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const note = await loadInWorkspace(ws.value, id);
    if (!note.ok) return note;
    return ok(toNoteDTO(note.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateNoteInput,
  ): Promise<Result<NoteDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const refs = await assertRelationRefs(ws.value, input);
    if (!refs.ok) return refs;

    const updated = await NoteRepository.update(id, {
      updatedById: userId,
      ...input,
    });
    if (!updated.ok) return updated;
    const dto = toNoteDTO(updated.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "note",
      event: "updated",
      record: dto,
      changedFields: Object.keys(input),
    });
    return ok(dto);
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<NoteDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await NoteRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    const dto = toNoteDTO(removed.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "note",
      event: "deleted",
      record: dto,
    });
    return ok(dto);
  },

  /** Persiste a ordem manual das notas (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    return NoteRepository.reorder(ws.value, ids);
  },
};
