import type {
  SocialConnection,
  SocialConnectionStatus,
  SocialPlatform,
} from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

/** Dados (já cifrados) para criar/atualizar uma conexão via OAuth. */
export type UpsertSocialConnectionData = {
  workspaceId: string;
  platform: SocialPlatform;
  createdById: string;
  externalAccountId: string;
  accountName: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scope: string | null;
};

/** Acesso a dados de conexões de rede social. Sem regra de negócio — só Prisma. */
export const SocialConnectionRepository = {
  /** Conexões da workspace, ordenadas por criação. */
  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<SocialConnection[]>> {
    try {
      const connections = await prisma.socialConnection.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "asc" },
      });
      return ok(connections);
    } catch {
      return err(databaseError());
    }
  },

  async findByWorkspaceAndPlatform(
    workspaceId: string,
    platform: SocialPlatform,
  ): Promise<Result<SocialConnection | null>> {
    try {
      const connection = await prisma.socialConnection.findUnique({
        where: { workspaceId_platform: { workspaceId, platform } },
      });
      return ok(connection);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Cria ou atualiza a conexão da plataforma (reconectar substitui os tokens).
   * `createdById` só é gravado na criação; em update vira `updatedById`.
   */
  async upsertByPlatform(
    data: UpsertSocialConnectionData,
  ): Promise<Result<SocialConnection>> {
    try {
      const connection = await prisma.socialConnection.upsert({
        where: {
          workspaceId_platform: {
            workspaceId: data.workspaceId,
            platform: data.platform,
          },
        },
        create: {
          platform: data.platform,
          externalAccountId: data.externalAccountId,
          accountName: data.accountName,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpiresAt: data.tokenExpiresAt,
          scope: data.scope,
          status: "CONNECTED",
          workspaceId: data.workspaceId,
          createdById: data.createdById,
        },
        update: {
          externalAccountId: data.externalAccountId,
          accountName: data.accountName,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpiresAt: data.tokenExpiresAt,
          scope: data.scope,
          status: "CONNECTED",
          updatedById: data.createdById,
        },
      });
      return ok(connection);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Atualiza só as credenciais de uma conexão existente (usado após renovar o
   * access token). `refreshToken`/`scope` ausentes são preservados. Não mexe em
   * `createdById`/`updatedById` — refresh é automático, não ação de usuário.
   */
  async updateTokens(
    id: string,
    data: {
      accessToken: string;
      refreshToken?: string | null;
      tokenExpiresAt: Date | null;
      scope?: string | null;
    },
  ): Promise<Result<SocialConnection>> {
    try {
      const connection = await prisma.socialConnection.update({
        where: { id },
        data: {
          accessToken: data.accessToken,
          tokenExpiresAt: data.tokenExpiresAt,
          status: "CONNECTED",
          ...(data.refreshToken != null && {
            refreshToken: data.refreshToken,
          }),
          ...(data.scope != null && { scope: data.scope }),
        },
      });
      return ok(connection);
    } catch {
      return err(databaseError());
    }
  },

  /** Atualiza apenas o status (ex.: marcar EXPIRED quando o refresh falha). */
  async updateStatus(
    id: string,
    status: SocialConnectionStatus,
  ): Promise<Result<SocialConnection>> {
    try {
      const connection = await prisma.socialConnection.update({
        where: { id },
        data: { status },
      });
      return ok(connection);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Remove (desconecta) a conexão da plataforma. Retorna `false` quando não
   * existia conexão para remover.
   */
  async deleteByPlatform(
    workspaceId: string,
    platform: SocialPlatform,
  ): Promise<Result<boolean>> {
    try {
      const result = await prisma.socialConnection.deleteMany({
        where: { workspaceId, platform },
      });
      return ok(result.count > 0);
    } catch {
      return err(databaseError());
    }
  },
};
