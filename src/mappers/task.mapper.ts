import type { Task } from "@prisma/client";
import type { TaskDTO } from "@/src/schemas/task.schema";

/** `Prisma.Task` → `TaskDTO` (datas em ISO). */
export function toTaskDTO(task: Task): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    body: task.body,
    dueDate: task.dueDate === null ? null : task.dueDate.toISOString(),
    assigneeId: task.assigneeId,
    companyId: task.companyId,
    personId: task.personId,
    opportunityId: task.opportunityId,
    workspaceId: task.workspaceId,
    createdById: task.createdById,
    updatedById: task.updatedById,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    deletedAt: task.deletedAt === null ? null : task.deletedAt.toISOString(),
  };
}
