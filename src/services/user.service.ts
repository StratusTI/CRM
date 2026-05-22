import { ok, type Result } from "@/src/lib/result";
import { toUserDTO } from "@/src/mappers/user.mapper";
import { UserRepository } from "@/src/repositories/user.repository";
import type { UpdateProfileInput, UserDTO } from "@/src/schemas/user.schema";

/** Janela de carência (LGPD) antes da exclusão efetiva da conta. */
const DELETION_GRACE_DAYS = 30;

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
    const when = new Date(
      Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );
    const result = await UserRepository.scheduleDeletion(userId, when);
    if (!result.ok) return result;
    return ok(toUserDTO(result.value));
  },

  async cancelDeletion(userId: string): Promise<Result<UserDTO>> {
    const result = await UserRepository.cancelDeletion(userId);
    if (!result.ok) return result;
    return ok(toUserDTO(result.value));
  },
};
