import { z } from "zod";

/** Contrato da feature Dashboard (create / update / list / get / soft-delete). */

const TitleSchema = z
  .string()
  .trim()
  .min(1, "Informe o título do dashboard")
  .max(300, "Título muito longo");

/** Referência ao layout da página customizável (montado em fase posterior). */
const PageLayoutIdSchema = z.string().trim().min(1).max(300);

export const CreateDashboardSchema = z.object({
  title: TitleSchema,
  pageLayoutId: PageLayoutIdSchema.optional(),
});

/**
 * Atualização parcial. `pageLayoutId` aceita `null` para desvincular o layout;
 * `title` não pode ser nulificado.
 */
export const UpdateDashboardSchema = z
  .object({
    title: TitleSchema,
    pageLayoutId: PageLayoutIdSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const DashboardOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  pageLayoutId: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type CreateDashboardInput = z.infer<typeof CreateDashboardSchema>;
export type UpdateDashboardInput = z.infer<typeof UpdateDashboardSchema>;
export type DashboardDTO = z.infer<typeof DashboardOutputSchema>;
