import { z } from "zod";
import { CreatePersonSchema } from "@/src/schemas/person.schema";

/** Contrato da ingestão em lote de pessoas vinda de sistemas externos. */

export const MAX_INGEST_BATCH = 100;

export const IngestPeopleSchema = z.object({
  people: z
    .array(CreatePersonSchema)
    .min(1, "Envie ao menos uma pessoa")
    .max(
      MAX_INGEST_BATCH,
      `No máximo ${MAX_INGEST_BATCH} pessoas por requisição`,
    ),
});

const IngestItemResultSchema = z.discriminatedUnion("status", [
  z.object({
    index: z.number(),
    status: z.literal("created"),
    id: z.string(),
  }),
  z.object({
    index: z.number(),
    status: z.literal("failed"),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);

export const IngestPeopleReportSchema = z.object({
  total: z.number(),
  created: z.number(),
  failed: z.number(),
  results: z.array(IngestItemResultSchema),
});

export type IngestPeopleInput = z.infer<typeof IngestPeopleSchema>;
export type IngestPeopleReport = z.infer<typeof IngestPeopleReportSchema>;
export type IngestItemResult = z.infer<typeof IngestItemResultSchema>;
