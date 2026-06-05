import { lastOwnerProtected } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toUserDTO } from "@/src/mappers/user.mapper";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import { UserRepository } from "@/src/repositories/user.repository";
import type { UpdateProfileInput, UserDTO } from "@/src/schemas/user.schema";

/** Janela de carência (LGPD) antes da exclusão efetiva da conta. */
const DELETION_GRACE_DAYS = 30;

/** Dados exportáveis do titular (portabilidade LGPD): perfil + vínculos. */
export type UserDataExport = {
  user: UserDTO;
  workspaces: { name: string; slug: string; role: string }[];
  exportedAt: string;
};

export const UserService = {
  async getMe(userId: string): Promise<Result<UserDTO>> {
    const result = await UserRepository.findById(userId);
    if (!result.ok) return result;
    return ok(toUserDTO(result.value));
  },

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<Result<UserDTO>> {
    const result = await UserRepository.updateProfile(userId, input);
    if (!result.ok) return result;
    return ok(toUserDTO(result.value));
  },

  async acceptConsent(userId: string): Promise<Result<UserDTO>> {
    const result = await UserRepository.acceptConsent(userId, new Date());
    if (!result.ok) return result;
    return ok(toUserDTO(result.value));
  },

  async scheduleDeletion(userId: string): Promise<Result<UserDTO>> {
    // Bloqueia se o titular for o único proprietário de alguma workspace —
    // ele precisa transferir a propriedade antes de excluir a conta.
    const sole = await MembershipRepository.listSoleOwnerWorkspaces(userId);
    if (!sole.ok) return sole;
    if (sole.value.length > 0) {
      const names = sole.value.map((w) => w.name).join(", ");
      return err(
        lastOwnerProtected(
          `Transfira a propriedade antes de excluir a conta: ${names}`,
        ),
      );
    }

    const when = new Date(
      Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );
    const result = await UserRepository.scheduleDeletion(userId, when);
    if (!result.ok) return result;
    return ok(toUserDTO(result.value));
  },

  /** Exporta os dados pessoais do titular + seus vínculos (portabilidade). */
  async exportData(userId: string): Promise<Result<UserDataExport>> {
    const me = await UserRepository.findById(userId);
    if (!me.ok) return me;

    const memberships = await MembershipRepository.listByUser(userId);
    if (!memberships.ok) return memberships;

    return ok({
      user: toUserDTO(me.value),
      workspaces: memberships.value.map((m) => ({
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
      })),
      exportedAt: new Date().toISOString(),
    });
  },

  async cancelDeletion(userId: string): Promise<Result<UserDTO>> {
    const result = await UserRepository.cancelDeletion(userId);
    if (!result.ok) return result;
    return ok(toUserDTO(result.value));
  },
};
