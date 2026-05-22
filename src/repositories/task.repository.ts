import type { Task, TaskStatus } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateTaskData = {
  workspaceId: string;
  createdById: string;
  title: string;
  status: TaskStatus;
  body: string | null;
  dueDate: Date | null;
  assigneeId: string | null;
  companyId: string | null;
  personId: string | null;
  opportunityId: string | null;
};

export type UpdateTaskData = {
  updatedById: string;
  title?: string;
  status?: TaskStatus;
  body?: string | null;
  dueDate?: Date | null;
  assigneeId?: string | null;
  companyId?: string | null;
  personId?: string | null;
  opportunityId?: string | null;
};

/** Acesso a dados de tarefa. Sem regra de negócio — só Prisma. */
export const TaskRepository = {
  async create(data: CreateTaskData): Promise<Result<Task>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const task = await prisma.task.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(task);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Task | null>> {
    try {
      const task = await prisma.task.findUnique({ where: { id } });
      return ok(task);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<Task[]>> {
    try {
      const tasks = await prisma.task.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(tasks);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.task.updateMany({
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

  async update(id: string, data: UpdateTaskData): Promise<Result<Task>> {
    try {
      const task = await prisma.task.update({ where: { id }, data });
      return ok(task);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Task>> {
    try {
      const task = await prisma.task.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(task);
    } catch {
      return err(databaseError());
    }
  },
};
