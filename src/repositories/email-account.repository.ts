import type { EmailAccount, MailProvider } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type UpsertEmailAccountData = {
  workspaceId: string;
  userId: string;
  provider: MailProvider;
  email: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scope: string | null;
};

/** Acesso a dados das contas de e-mail conectadas. */
export const EmailAccountRepository = {
  /** Cria ou atualiza a conexão (chave workspace+user+provider). */
  async upsert(data: UpsertEmailAccountData): Promise<Result<EmailAccount>> {
    try {
      const account = await prisma.emailAccount.upsert({
        where: {
          workspaceId_userId_provider: {
            workspaceId: data.workspaceId,
            userId: data.userId,
            provider: data.provider,
          },
        },
        create: data,
        update: {
          email: data.email,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpiresAt: data.tokenExpiresAt,
          scope: data.scope,
        },
      });
      return ok(account);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<EmailAccount | null>> {
    try {
      const account = await prisma.emailAccount.findUnique({ where: { id } });
      return ok(account);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<EmailAccount[]>> {
    try {
      const accounts = await prisma.emailAccount.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "asc" },
      });
      return ok(accounts);
    } catch {
      return err(databaseError());
    }
  },

  /** Contas do usuário numa workspace. */
  async listByUser(
    workspaceId: string,
    userId: string,
  ): Promise<Result<EmailAccount[]>> {
    try {
      const accounts = await prisma.emailAccount.findMany({
        where: { workspaceId, userId },
        orderBy: { createdAt: "asc" },
      });
      return ok(accounts);
    } catch {
      return err(databaseError());
    }
  },

  /** Todas as contas (para o cron de sync). */
  async listAll(): Promise<Result<EmailAccount[]>> {
    try {
      const accounts = await prisma.emailAccount.findMany();
      return ok(accounts);
    } catch {
      return err(databaseError());
    }
  },

  async updateTokens(
    id: string,
    data: { accessToken: string; tokenExpiresAt: Date | null },
  ): Promise<Result<EmailAccount>> {
    try {
      const account = await prisma.emailAccount.update({
        where: { id },
        data,
      });
      return ok(account);
    } catch {
      return err(databaseError());
    }
  },

  async markSynced(id: string): Promise<Result<true>> {
    try {
      await prisma.emailAccount.update({
        where: { id },
        data: { lastSyncedAt: new Date() },
      });
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },

  async delete(id: string, workspaceId: string): Promise<Result<true>> {
    try {
      await prisma.emailAccount.deleteMany({ where: { id, workspaceId } });
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },
};
