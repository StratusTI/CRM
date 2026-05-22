import type { Note } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateNoteData = {
  workspaceId: string;
  createdById: string;
  title: string | null;
  body: string | null;
  companyId: string | null;
  personId: string | null;
  opportunityId: string | null;
};

export type UpdateNoteData = {
  updatedById: string;
  title?: string | null;
  body?: string | null;
  companyId?: string | null;
  personId?: string | null;
  opportunityId?: string | null;
};

/** Acesso a dados de nota. Sem regra de negócio — só Prisma. */
export const NoteRepository = {
  async create(data: CreateNoteData): Promise<Result<Note>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const note = await prisma.note.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(note);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Note | null>> {
    try {
      const note = await prisma.note.findUnique({ where: { id } });
      return ok(note);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<Note[]>> {
    try {
      const notes = await prisma.note.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(notes);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.note.updateMany({
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

  async update(id: string, data: UpdateNoteData): Promise<Result<Note>> {
    try {
      const note = await prisma.note.update({ where: { id }, data });
      return ok(note);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Note>> {
    try {
      const note = await prisma.note.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(note);
    } catch {
      return err(databaseError());
    }
  },
};
