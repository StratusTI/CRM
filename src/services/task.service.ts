import type { Task } from "@prisma/client";
import { taskNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toTaskDTO } from "@/src/mappers/task.mapper";
import {
  TaskRepository,
  type UpdateTaskData,
} from "@/src/repositories/task.repository";
import type {
  CreateTaskInput,
  TaskDTO,
  UpdateTaskInput,
} from "@/src/schemas/task.schema";
import { assertRelationRefs } from "@/src/services/relation-refs";
import { dispatchRecordEvent } from "@/src/services/workflow-dispatcher";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Task>> {
  const found = await TaskRepository.findById(id);
  if (!found.ok) return found;
  const task = found.value;
  if (!task || task.workspaceId !== workspaceId || task.deletedAt) {
    return err(taskNotFound());
  }
  return ok(task);
}

export const TaskService = {
  async create(
    userId: string,
    slug: string,
    input: CreateTaskInput,
  ): Promise<Result<TaskDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "tasks",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    const refs = await assertRelationRefs(ws.value, input);
    if (!refs.ok) return refs;

    const created = await TaskRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      title: input.title,
      status: input.status,
      body: input.body ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assigneeId: input.assigneeId ?? null,
      companyId: input.companyId ?? null,
      personId: input.personId ?? null,
      opportunityId: input.opportunityId ?? null,
    });
    if (!created.ok) return created;
    const dto = toTaskDTO(created.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "task",
      event: "created",
      record: dto,
    });
    return ok(dto);
  },

  async list(userId: string, slug: string): Promise<Result<TaskDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "tasks",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const result = await TaskRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toTaskDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<TaskDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "tasks",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const task = await loadInWorkspace(ws.value, id);
    if (!task.ok) return task;
    return ok(toTaskDTO(task.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateTaskInput,
  ): Promise<Result<TaskDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "tasks",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const refs = await assertRelationRefs(ws.value, input);
    if (!refs.ok) return refs;

    const { dueDate, ...rest } = input;
    const data: UpdateTaskData = { updatedById: userId, ...rest };
    if (dueDate !== undefined) {
      data.dueDate = dueDate === null ? null : new Date(dueDate);
    }

    const updated = await TaskRepository.update(id, data);
    if (!updated.ok) return updated;
    const dto = toTaskDTO(updated.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "task",
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
  ): Promise<Result<TaskDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "tasks",
      action: "DELETE",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await TaskRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    const dto = toTaskDTO(removed.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "task",
      event: "deleted",
      record: dto,
    });
    return ok(dto);
  },

  /** Persiste a ordem manual das tarefas (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "tasks",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    return TaskRepository.reorder(ws.value, ids);
  },
};
