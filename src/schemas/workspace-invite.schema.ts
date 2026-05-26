import { z } from "zod";

/**
 * Contrato do convite por link de workspace.
 *
 * Cada workspace tem 0 ou 1 convite ativo. O token vira parte da URL
 * compartilhável (`/invite/<token>`). O role é o que o aceitante recebe na
 * membership criada — OWNER é proibido (só o criador do workspace é OWNER).
 */

export const WorkspaceInviteRoleSchema = z.enum(["MEMBER", "ADMIN"]);

export const UpdateWorkspaceInviteSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: WorkspaceInviteRoleSchema.optional(),
    regenerate: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.isActive !== undefined ||
      data.role !== undefined ||
      data.regenerate === true,
    { message: "Nenhuma alteração informada" },
  );

export const WorkspaceInviteOutputSchema = z.object({
  token: z.string(),
  role: WorkspaceInviteRoleSchema,
  isActive: z.boolean(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PublicInviteOutputSchema = z.object({
  workspaceName: z.string(),
  workspaceSlug: z.string(),
  role: WorkspaceInviteRoleSchema,
});

export type WorkspaceInviteRole = z.infer<typeof WorkspaceInviteRoleSchema>;
export type UpdateWorkspaceInviteInput = z.infer<
  typeof UpdateWorkspaceInviteSchema
>;
export type WorkspaceInviteDTO = z.infer<typeof WorkspaceInviteOutputSchema>;
export type PublicInviteDTO = z.infer<typeof PublicInviteOutputSchema>;
