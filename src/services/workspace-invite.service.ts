import { randomBytes } from "node:crypto";
import {
  forbidden,
  workspaceAlreadyMember,
  workspaceForbidden,
  workspaceInviteDisabled,
  workspaceInviteNotFound,
  workspaceNotFound,
} from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";
import {
  toPublicInviteDTO,
  toWorkspaceInviteDTO,
} from "@/src/mappers/workspace-invite.mapper";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import { WorkspaceInviteRepository } from "@/src/repositories/workspace-invite.repository";
import type {
  PublicInviteDTO,
  UpdateWorkspaceInviteInput,
  WorkspaceInviteDTO,
} from "@/src/schemas/workspace-invite.schema";

/** ~32 chars URL-safe; suficiente entropia para uso de share-link interno. */
function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Garante que o usuário é OWNER/ADMIN da workspace; retorna o id da workspace. */
async function ensureManager(
  userId: string,
  slug: string,
): Promise<Result<{ workspaceId: string }>> {
  const membership = await MembershipRepository.findByUserAndSlug(userId, slug);
  if (!membership.ok) return membership;
  if (!membership.value) return err(workspaceNotFound());
  if (membership.value.role === "MEMBER") return err(workspaceForbidden());
  return ok({ workspaceId: membership.value.workspace.id });
}

export const WorkspaceInviteService = {
  /**
   * Lê o convite do workspace, criando um (com role MEMBER, ativo) se ainda
   * não existir. Exige OWNER/ADMIN.
   */
  async getOrCreate(
    userId: string,
    slug: string,
    origin: string,
  ): Promise<Result<WorkspaceInviteDTO>> {
    const manager = await ensureManager(userId, slug);
    if (!manager.ok) return manager;

    const existing = await WorkspaceInviteRepository.findByWorkspaceId(
      manager.value.workspaceId,
    );
    if (!existing.ok) return existing;
    if (existing.value) return ok(toWorkspaceInviteDTO(existing.value, origin));

    const created = await WorkspaceInviteRepository.create({
      workspaceId: manager.value.workspaceId,
      createdById: userId,
      token: generateToken(),
      role: "MEMBER",
    });
    if (!created.ok) return created;
    return ok(toWorkspaceInviteDTO(created.value, origin));
  },

  /**
   * Atualiza isActive/role e/ou rotaciona o token (regenerate: true).
   * Garante que o convite existe — chama getOrCreate antes para o caso edge
   * onde o admin nunca abriu a tela.
   */
  async update(
    userId: string,
    slug: string,
    input: UpdateWorkspaceInviteInput,
    origin: string,
  ): Promise<Result<WorkspaceInviteDTO>> {
    const manager = await ensureManager(userId, slug);
    if (!manager.ok) return manager;

    const current = await WorkspaceInviteRepository.findByWorkspaceId(
      manager.value.workspaceId,
    );
    if (!current.ok) return current;
    if (!current.value) return err(workspaceInviteNotFound());

    const updated = await WorkspaceInviteRepository.update(
      manager.value.workspaceId,
      {
        isActive: input.isActive,
        role: input.role,
        token: input.regenerate ? generateToken() : undefined,
      },
    );
    if (!updated.ok) return updated;
    return ok(toWorkspaceInviteDTO(updated.value, origin));
  },

  /** Tela pública de aceitar: não exige sessão. Bloqueia se desativado. */
  async getPublicByToken(token: string): Promise<Result<PublicInviteDTO>> {
    const invite = await WorkspaceInviteRepository.findByToken(token);
    if (!invite.ok) return invite;
    if (!invite.value) return err(workspaceInviteNotFound());
    if (!invite.value.isActive) return err(workspaceInviteDisabled());
    return ok(toPublicInviteDTO(invite.value));
  },

  /**
   * Cria a membership para o usuário a partir do token. Falha se o convite
   * estiver desativado ou se o usuário já é membro.
   * Retorna `{ slug }` para o caller redirecionar pra workspace.
   */
  async accept(
    userId: string,
    token: string,
  ): Promise<Result<{ slug: string }>> {
    const invite = await WorkspaceInviteRepository.findByToken(token);
    if (!invite.ok) return invite;
    if (!invite.value) return err(workspaceInviteNotFound());
    if (!invite.value.isActive) return err(workspaceInviteDisabled());

    const workspaceId = invite.value.workspace.id;

    const existingMembership = await MembershipRepository.findByUserAndSlug(
      userId,
      invite.value.workspace.slug,
    );
    if (!existingMembership.ok) return existingMembership;
    if (existingMembership.value) return err(workspaceAlreadyMember());

    // Defesa: OWNER nunca deve ser distribuído por convite.
    if (invite.value.role === "OWNER") return err(forbidden());

    try {
      await prisma.membership.create({
        data: {
          userId,
          workspaceId,
          role: invite.value.role,
        },
      });
    } catch {
      return err(workspaceAlreadyMember());
    }

    return ok({ slug: invite.value.workspace.slug });
  },
};
