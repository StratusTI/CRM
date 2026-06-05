import type { CustomFieldValue, Prisma } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type ValueWrite = {
  definitionId: string;
  recordId: string;
  value: Prisma.InputJsonValue | null;
};

/** Acesso a dados dos valores de campos customizados. Sem regra — só Prisma. */
export const CustomFieldValueRepository = {
  /** Valores de vários registros (batch, para montar os DTOs sem N+1). */
  async listByRecords(
    recordIds: string[],
  ): Promise<Result<CustomFieldValue[]>> {
    if (recordIds.length === 0) return ok([]);
    try {
      const values = await prisma.customFieldValue.findMany({
        where: { recordId: { in: recordIds } },
      });
      return ok(values);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Aplica os valores de um registro numa transação: `null`/vazio remove o
   * valor; demais fazem upsert pela chave (definitionId, recordId).
   */
  async applyForRecord(writes: ValueWrite[]): Promise<Result<true>> {
    if (writes.length === 0) return ok(true);
    try {
      await prisma.$transaction(
        writes.map((w) => {
          if (w.value === null) {
            return prisma.customFieldValue.deleteMany({
              where: { definitionId: w.definitionId, recordId: w.recordId },
            });
          }
          return prisma.customFieldValue.upsert({
            where: {
              definitionId_recordId: {
                definitionId: w.definitionId,
                recordId: w.recordId,
              },
            },
            create: {
              definitionId: w.definitionId,
              recordId: w.recordId,
              value: w.value,
            },
            update: { value: w.value },
          });
        }),
      );
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },
};
