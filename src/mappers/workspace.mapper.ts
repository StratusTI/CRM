import type { Workspace } from "@prisma/client";
import type { WorkspaceDTO } from "@/src/schemas/workspace.schema";

/** `Prisma.Workspace` → `WorkspaceDTO` (datas serializadas em ISO). */
export function toWorkspaceDTO(workspace: Workspace): WorkspaceDTO {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}
