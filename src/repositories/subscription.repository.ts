import type { Prisma, Subscription } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

/** Acesso a dados da assinatura da workspace. Sem regra de negócio — só Prisma. */
export const SubscriptionRepository = {
  async findByWorkspace(
    workspaceId: string,
  ): Promise<Result<Subscription | null>> {
    try {
      const sub = await prisma.subscription.findUnique({
        where: { workspaceId },
      });
      return ok(sub);
    } catch {
      return err(databaseError());
    }
  },

  /** Cria ou atualiza a assinatura (1:1 com a workspace). */
  async upsert(
    workspaceId: string,
    data: Omit<Prisma.SubscriptionUncheckedCreateInput, "workspaceId">,
  ): Promise<Result<Subscription>> {
    try {
      const sub = await prisma.subscription.upsert({
        where: { workspaceId },
        create: { workspaceId, ...data },
        update: data,
      });
      return ok(sub);
    } catch {
      return err(databaseError());
    }
  },
};
