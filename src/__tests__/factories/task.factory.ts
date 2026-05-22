import type { Prisma, Task } from "@prisma/client";

type TaskOverrides = Partial<
  Omit<Prisma.TaskCreateInput, "workspace" | "createdBy">
>;

/** Cria uma tarefa real no banco de testes, escopada a workspace + criador. */
export async function createTask(
  workspaceId: string,
  createdById: string,
  overrides: TaskOverrides = {},
): Promise<Task> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.task.create({
    data: {
      title: overrides.title ?? "Follow up",
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
