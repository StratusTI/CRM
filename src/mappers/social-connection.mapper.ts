import type { SocialConnection } from "@prisma/client";
import type { SocialConnectionDTO } from "@/src/schemas/social-connection.schema";

/**
 * `Prisma.SocialConnection` → `SocialConnectionDTO`. Datas em ISO e, por
 * segurança, **omite** access/refresh token — o cliente nunca vê credenciais.
 */
export function toSocialConnectionDTO(
  connection: SocialConnection,
): SocialConnectionDTO {
  return {
    id: connection.id,
    workspaceId: connection.workspaceId,
    platform: connection.platform,
    accountName: connection.accountName,
    externalAccountId: connection.externalAccountId,
    scope: connection.scope,
    status: connection.status,
    expiresAt:
      connection.tokenExpiresAt === null
        ? null
        : connection.tokenExpiresAt.toISOString(),
    createdById: connection.createdById,
    updatedById: connection.updatedById,
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}
