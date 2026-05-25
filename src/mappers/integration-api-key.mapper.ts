import type { IntegrationApiKey } from "@prisma/client";
import type { IntegrationApiKeyDTO } from "@/src/schemas/integration-api-key.schema";

/** `Prisma.IntegrationApiKey` → DTO (datas em ISO, sem o hash do segredo). */
export function toIntegrationApiKeyDTO(
  key: IntegrationApiKey,
): IntegrationApiKeyDTO {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    workspaceId: key.workspaceId,
    createdById: key.createdById,
    lastUsedAt: key.lastUsedAt === null ? null : key.lastUsedAt.toISOString(),
    revokedAt: key.revokedAt === null ? null : key.revokedAt.toISOString(),
    createdAt: key.createdAt.toISOString(),
  };
}
