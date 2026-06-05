import { z } from "zod";

/** Contrato da feature Pipeline + PipelineStage (funil de vendas configurável). */

export const STAGE_CATEGORIES = ["OPEN", "WON", "LOST"] as const;

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome")
  .max(120, "Nome muito longo");

const StageNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da etapa")
  .max(80, "Nome da etapa muito longo");

const ProbabilitySchema = z
  .number("Probabilidade inválida")
  .int("Probabilidade deve ser inteira")
  .min(0, "Mínimo 0")
  .max(100, "Máximo 100");

const CategorySchema = z.enum(STAGE_CATEGORIES);
const ColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use #RRGGBB)");

/** Etapa na criação/atualização de um pipeline (sem id quando nova). */
export const StageInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: StageNameSchema,
  probability: ProbabilitySchema.optional().default(0),
  category: CategorySchema.optional().default("OPEN"),
  color: ColorSchema.nullable().optional(),
});

export const CreatePipelineSchema = z.object({
  name: NameSchema,
  stages: z
    .array(StageInputSchema)
    .min(1, "Crie ao menos uma etapa")
    .max(40, "Etapas demais"),
});

export const UpdatePipelineSchema = z
  .object({
    name: NameSchema,
    stages: z
      .array(StageInputSchema)
      .min(1, "Crie ao menos uma etapa")
      .max(40, "Etapas demais"),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const PipelineStageOutputSchema = z.object({
  id: z.string(),
  pipelineId: z.string(),
  name: z.string(),
  position: z.number(),
  probability: z.number(),
  category: CategorySchema,
  color: z.string().nullable(),
});

export const PipelineOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number(),
  isDefault: z.boolean(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stages: z.array(PipelineStageOutputSchema),
});

export type StageInput = z.infer<typeof StageInputSchema>;
export type CreatePipelineInput = z.infer<typeof CreatePipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineSchema>;
export type PipelineStageDTO = z.infer<typeof PipelineStageOutputSchema>;
export type PipelineDTO = z.infer<typeof PipelineOutputSchema>;
