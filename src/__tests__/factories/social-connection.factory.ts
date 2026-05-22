import { randomUUID } from "node:crypto";
import type { Prisma, SocialConnection } from "@prisma/client";

type SocialConnectionOverrides = Partial<
  Omit<Prisma.SocialConnectionCreateInput, "workspace" | "createdBy">
>;

/** Cria uma conexão de rede social real no banco de testes (escopo + criador). */
export async function createSocialConnection(
  workspaceId: string,
  createdById: string,
  overrides: SocialConnectionOverrides = {},
): Promise<SocialConnection> {
  const { prisma } = await import("@/src/lib/prisma");
  const suffix = randomUUID().slice(0, 8);
  return prisma.socialConnection.create({
    data: {
      platform: overrides.platform ?? "INSTAGRAM",
      externalAccountId: overrides.externalAccountId ?? `ext-${suffix}`,
      accountName: overrides.accountName ?? "@acme",
      accessToken: overrides.accessToken ?? "cipher-access",
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
