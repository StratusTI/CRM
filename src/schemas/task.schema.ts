import { z } from "zod";

/** Contrato da feature Task (create / update / list / get / soft-delete). */

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

const TitleSchema = z
  .string()
  .trim()
  .min(1, "Informe o título da tarefa")
  .max(300, "Título muito longo");

const BodySchema = z.string().trim().max(20_000, "Conteúdo muito longo");
const StatusSchema = z.enum(TASK_STATUSES);
const DueDateSchema = z.iso.datetime("Data de vencimento inválida");
const IdSchema = z.string().trim().min(1);

export const CreateTaskSchema = z.object({
  title: TitleSchema,
  status: StatusSchema.optional().default("TODO"),
  body: BodySchema.optional(),
  dueDate: DueDateSchema.optional(),
  assigneeId: IdSchema.optional(),
  companyId: IdSchema.optional(),
  personId: IdSchema.optional(),
  opportunityId: IdSchema.optional(),
});

export const UpdateTaskSchema = z
  .object({
    title: TitleSchema,
    status: StatusSchema,
    body: BodySchema.nullable(),
    dueDate: DueDateSchema.nullable(),
    assigneeId: IdSchema.nullable(),
    companyId: IdSchema.nullable(),
    personId: IdSchema.nullable(),
    opportunityId: IdSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const TaskOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  body: z.string().nullable(),
  dueDate: z.string().nullable(),
  assigneeId: z.string().nullable(),
  companyId: z.string().nullable(),
  personId: z.string().nullable(),
  opportunityId: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskDTO = z.infer<typeof TaskOutputSchema>;
