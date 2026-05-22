import type { User } from "@prisma/client";
import { databaseError, userNotFound } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

type UpdateProfileData = {
  name?: string;
  image?: string | null;
};

/**
 * Acesso a dados do usuário. Apenas campos de domínio (perfil + LGPD);
 * email/senha/sessão são gerenciados pelo better-auth.
 */
export const UserRepository = {
  async findById(id: string): Promise<Result<User>> {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return err(userNotFound());
      return ok(user);
    } catch {
      return err(databaseError());
    }
  },

  async updateProfile(
    id: string,
    data: UpdateProfileData,
  ): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({ where: { id }, data });
      return ok(user);
    } catch {
      return err(databaseError());
    }
  },

  async acceptConsent(id: string, at: Date): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { acceptedTermsAt: at, acceptedPrivacyAt: at },
      });
      return ok(user);
    } catch {
      return err(databaseError());
    }
  },

  async scheduleDeletion(id: string, at: Date): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { deletionScheduledAt: at },
      });
      return ok(user);
    } catch {
      return err(databaseError());
    }
  },

  async cancelDeletion(id: string): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { deletionScheduledAt: null },
      });
      return ok(user);
    } catch {
      return err(databaseError());
    }
  },
};
