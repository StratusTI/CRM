import type { User } from "@prisma/client";
import type { UserDTO } from "@/src/schemas/user.schema";

/** `Prisma.User` → `UserDTO` (datas serializadas em ISO). */
export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    acceptedTermsAt: user.acceptedTermsAt?.toISOString() ?? null,
    acceptedPrivacyAt: user.acceptedPrivacyAt?.toISOString() ?? null,
    deletionScheduledAt: user.deletionScheduledAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
