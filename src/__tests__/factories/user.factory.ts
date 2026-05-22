import { randomUUID } from "node:crypto";
import type { Prisma, User } from "@prisma/client";

/** Cria um usuário real no banco de testes. */
export async function createUser(
  overrides: Partial<Prisma.UserCreateInput> = {},
): Promise<User> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.user.create({
    data: {
      name: "Test User",
      email: `user-${randomUUID()}@example.com`,
      ...overrides,
    },
  });
}
