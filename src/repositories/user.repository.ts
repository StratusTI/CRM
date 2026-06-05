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

  /** Usuários com exclusão vencida e ainda não anonimizados (para o cron). */
  async findDueForDeletion(now: Date): Promise<Result<User[]>> {
    try {
      const users = await prisma.user.findMany({
        where: { deletionScheduledAt: { lte: now }, anonymizedAt: null },
      });
      return ok(users);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Anonimiza a conta (LGPD): apaga dados pessoais e revoga acesso numa
   * transação — limpa o User e remove sessões/credenciais/memberships. Os
   * registros de negócio criados pelo usuário são preservados (a autoria fica
   * apontando para a conta anonimizada).
   */
  async anonymize(id: string, at: Date): Promise<Result<User>> {
    try {
      const user = await prisma.$transaction(async (tx) => {
        await tx.session.deleteMany({ where: { userId: id } });
        await tx.account.deleteMany({ where: { userId: id } });
        await tx.membership.deleteMany({ where: { userId: id } });
        return tx.user.update({
          where: { id },
          data: {
            name: "Usuário removido",
            email: `deleted-${id}@deleted.invalid`,
            image: null,
            acceptedTermsAt: null,
            acceptedPrivacyAt: null,
            deletionScheduledAt: null,
            anonymizedAt: at,
          },
        });
      });
      return ok(user);
    } catch {
      return err(databaseError());
    }
  },
};
