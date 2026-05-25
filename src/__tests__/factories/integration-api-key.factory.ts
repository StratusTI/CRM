import type { IntegrationApiKey } from "@prisma/client";
import { generateApiKey } from "@/src/lib/integration/api-key";

type Overrides = {
  name?: string;
  revokedAt?: Date | null;
};

/**
 * Cria uma chave de API real no banco de testes e devolve o token em texto puro
 * (necessário para autenticar nos testes, já que o banco guarda só o hash).
 */
export async function createIntegrationApiKey(
  workspaceId: string,
  createdById: string,
  overrides: Overrides = {},
): Promise<{ key: IntegrationApiKey; token: string }> {
  const { prisma } = await import("@/src/lib/prisma");
  const { token, hash, prefix } = generateApiKey();
  const key = await prisma.integrationApiKey.create({
    data: {
      name: overrides.name ?? "Sistema externo",
      keyHash: hash,
      prefix,
      revokedAt: overrides.revokedAt ?? null,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
  return { key, token };
}
