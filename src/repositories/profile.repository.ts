import type { Prisma, Profile } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import {
  ROLE_TO_SYSTEM_KEY,
  SYSTEM_PROFILE_PERMISSIONS,
  SYSTEM_PROFILES,
} from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateProfileData = {
  workspaceId: string;
  name: string;
  permissions: Prisma.InputJsonValue;
};

/** Acesso a dados de perfis (RBAC). Sem regra de negócio — só Prisma. */
export const ProfileRepository = {
  async listByWorkspace(workspaceId: string): Promise<Result<Profile[]>> {
    try {
      const profiles = await prisma.profile.findMany({
        where: { workspaceId },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      });
      return ok(profiles);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Profile | null>> {
    try {
      const profile = await prisma.profile.findUnique({ where: { id } });
      return ok(profile);
    } catch {
      return err(databaseError());
    }
  },

  async existsByName(
    workspaceId: string,
    name: string,
    excludeId?: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.profile.count({
        where: {
          workspaceId,
          name,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  async create(data: CreateProfileData): Promise<Result<Profile>> {
    try {
      const profile = await prisma.profile.create({
        data: {
          workspaceId: data.workspaceId,
          name: data.name,
          permissions: data.permissions,
          isSystem: false,
        },
      });
      return ok(profile);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    id: string,
    data: { name?: string; permissions?: Prisma.InputJsonValue },
  ): Promise<Result<Profile>> {
    try {
      const profile = await prisma.profile.update({ where: { id }, data });
      return ok(profile);
    } catch {
      return err(databaseError());
    }
  },

  async delete(id: string): Promise<Result<true>> {
    try {
      await prisma.profile.delete({ where: { id } });
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },

  async countMemberships(profileId: string): Promise<Result<number>> {
    try {
      const count = await prisma.membership.count({ where: { profileId } });
      return ok(count);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Semeia os 3 perfis de sistema da workspace (idempotente) e liga as
   * memberships sem perfil ao perfil correspondente ao seu `role`. Retorna os
   * perfis da workspace.
   */
  async ensureSystemProfiles(workspaceId: string): Promise<Result<Profile[]>> {
    try {
      const existing = await prisma.profile.findMany({
        where: { workspaceId, isSystem: true },
      });
      if (existing.length < SYSTEM_PROFILES.length) {
        await prisma.$transaction(async (tx) => {
          for (const sp of SYSTEM_PROFILES) {
            const has = existing.some((p) => p.systemKey === sp.systemKey);
            if (has) continue;
            await tx.profile.create({
              data: {
                workspaceId,
                name: sp.name,
                isSystem: true,
                systemKey: sp.systemKey,
                permissions: SYSTEM_PROFILE_PERMISSIONS[
                  sp.systemKey
                ] as Prisma.InputJsonValue,
              },
            });
          }
        });
      }

      const profiles = await prisma.profile.findMany({
        where: { workspaceId },
      });
      const byKey = new Map(
        profiles.filter((p) => p.systemKey).map((p) => [p.systemKey, p.id]),
      );

      // Liga memberships ainda sem perfil ao perfil do seu papel.
      const orphanMemberships = await prisma.membership.findMany({
        where: { workspaceId, profileId: null },
      });
      await prisma.$transaction(
        orphanMemberships.map((m) =>
          prisma.membership.update({
            where: { id: m.id },
            data: { profileId: byKey.get(ROLE_TO_SYSTEM_KEY[m.role]) ?? null },
          }),
        ),
      );

      return ok(profiles);
    } catch {
      return err(databaseError());
    }
  },
};
