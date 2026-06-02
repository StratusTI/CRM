import type { Person } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreatePersonData = {
  workspaceId: string;
  createdById: string;
  name: string;
  emails: string[];
  phones: string[];
  city: string | null;
  jobTitle: string | null;
  linkedin: string | null;
  avatar: string | null;
  companyId: string | null;
};

export type UpdatePersonData = {
  updatedById: string;
  name?: string;
  emails?: string[];
  phones?: string[];
  city?: string | null;
  jobTitle?: string | null;
  linkedin?: string | null;
  avatar?: string | null;
  companyId?: string | null;
};

/** Acesso a dados de pessoa. Sem regra de negócio — só Prisma. */
export const PersonRepository = {
  async create(data: CreatePersonData): Promise<Result<Person>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const person = await prisma.person.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(person);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Person | null>> {
    try {
      const person = await prisma.person.findUnique({ where: { id } });
      return ok(person);
    } catch {
      return err(databaseError());
    }
  },

  async existsInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.person.count({
        where: { id, workspaceId, deletedAt: null },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Procura uma pessoa da workspace que compartilhe ao menos um e-mail ou
   * telefone com os informados — base da deduplicação na ingestão de leads.
   * Retorna a mais recente quando há mais de um match. `null` se nada casar
   * (ou se nenhum identificador foi fornecido).
   */
  async findByEmailOrPhone(
    workspaceId: string,
    emails: string[],
    phones: string[],
  ): Promise<Result<Person | null>> {
    if (emails.length === 0 && phones.length === 0) return ok(null);
    try {
      const person = await prisma.person.findFirst({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            ...(emails.length > 0 ? [{ emails: { hasSome: emails } }] : []),
            ...(phones.length > 0 ? [{ phones: { hasSome: phones } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      return ok(person);
    } catch {
      return err(databaseError());
    }
  },

  /** Soft delete já filtra; usado por outras features para validar referência. */
  async listByWorkspace(workspaceId: string): Promise<Result<Person[]>> {
    try {
      const people = await prisma.person.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(people);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.person.updateMany({
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

  async update(id: string, data: UpdatePersonData): Promise<Result<Person>> {
    try {
      const person = await prisma.person.update({ where: { id }, data });
      return ok(person);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Person>> {
    try {
      const person = await prisma.person.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(person);
    } catch {
      return err(databaseError());
    }
  },
};
