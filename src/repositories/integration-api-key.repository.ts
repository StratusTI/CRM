import type { IntegrationApiKey } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateIntegrationApiKeyData = {
  workspaceId: string;
  createdById: string;
  name: string;
  keyHash: string;
  prefix: string;
};

/** Acesso a dados das chaves de API de integração. Só Prisma. */
export const IntegrationApiKeyRepository = {
  async create(
    data: CreateIntegrationApiKeyData,
  ): Promise<Result<IntegrationApiKey>> {
    try {
      const key = await prisma.integrationApiKey.create({ data });
      return ok(key);
    } catch {
      return err(databaseError());
    }
  },

  /** Chave ativa (não revogada) pelo hash — usada na autenticação. */
  async findActiveByHash(
    keyHash: string,
  ): Promise<Result<IntegrationApiKey | null>> {
    try {
      const key = await prisma.integrationApiKey.findFirst({
        where: { keyHash, revokedAt: null },
      });
      return ok(key);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<IntegrationApiKey | null>> {
    try {
      const key = await prisma.integrationApiKey.findUnique({ where: { id } });
      return ok(key);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<IntegrationApiKey[]>> {
    try {
      const keys = await prisma.integrationApiKey.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
      });
      return ok(keys);
    } catch {
      return err(databaseError());
    }
  },

  /** Marca o último uso. Best-effort: falha de escrita não bloqueia a ingestão. */
  async touchLastUsed(id: string): Promise<void> {
    try {
      await prisma.integrationApiKey.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      });
    } catch {
      // ignora — atualizar o carimbo de uso não pode derrubar a requisição
    }
  },

  async revoke(id: string): Promise<Result<IntegrationApiKey>> {
    try {
      const key = await prisma.integrationApiKey.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      return ok(key);
    } catch {
      return err(databaseError());
    }
  },
};
