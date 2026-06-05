import type { Membership, Role } from "@prisma/client";

/**
 * Adiciona um usuário a uma workspace com um papel, ligando ao perfil de
 * sistema correspondente (semeia os perfis se necessário). Usado nos testes de
 * enforcement de permissões.
 */
export async function createMembership(
  workspaceId: string,
  userId: string,
  role: Role = "MEMBER",
): Promise<Membership> {
  const { prisma } = await import("@/src/lib/prisma");
  const { ProfileRepository } = await import(
    "@/src/repositories/profile.repository"
  );
  await ProfileRepository.ensureSystemProfiles(workspaceId);
  const profile = await prisma.profile.findFirst({
    where: { workspaceId, systemKey: role },
  });
  return prisma.membership.create({
    data: { workspaceId, userId, role, profileId: profile?.id ?? null },
  });
}
