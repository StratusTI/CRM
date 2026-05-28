import { z } from "zod";

/**
 * Contrato da feature Workflows.
 *
 * Um Workflow é um agrupamento estável (id+nome) com N WorkflowVersions —
 * cada versão tem `definition` (gatilho + nodes + edges) e um status
 * (DRAFT/ACTIVE/ARCHIVED). Edição sempre acontece no draft; "Activate"
 * congela o draft (vira ACTIVE) e arquiva a versão anterior.
 *
 * WorkflowRun referencia a versão usada — runs antigas continuam válidas
 * mesmo depois de edits no draft (snapshot por versão).
 */

/* ============================== enums =================================== */

/** Entidades CRM que nodes podem criar/atualizar/buscar/deletar. */
export const WORKFLOW_ENTITIES = [
  "company",
  "person",
  "opportunity",
  "task",
  "note",
] as const;
export type WorkflowEntity = (typeof WORKFLOW_ENTITIES)[number];

export const WORKFLOW_STATUSES = ["DRAFT", "ACTIVE", "DEACTIVATED"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_VERSION_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
] as const;
export type WorkflowVersionStatus = (typeof WORKFLOW_VERSION_STATUSES)[number];

export const WORKFLOW_RUN_STATUSES = [
  "PENDING",
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELED",
] as const;
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number];

export const WORKFLOW_RUN_STEP_STATUSES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
] as const;
export type WorkflowRunStepStatus = (typeof WORKFLOW_RUN_STEP_STATUSES)[number];

export const WORKFLOW_TRIGGER_TYPES = [
  "record-is-created",
  "record-is-updated",
  "record-is-deleted",
  "record-is-created-or-updated",
  "launch-manually",
  "on-a-schedule",
  "webhook",
] as const;
export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number];

export const WORKFLOW_NODE_TYPES = [
  "create-record",
  "update-record",
  "delete-record",
  "search-records",
  "create-or-update-record",
  "iterator",
  "filter",
  "if-else",
  "delay",
  "send-email",
  "draft-email",
  "form",
] as const;
export type WorkflowNodeType = (typeof WORKFLOW_NODE_TYPES)[number];

export const WORKFLOW_FILTER_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
  "gt",
  "gte",
  "lt",
  "lte",
] as const;
export type WorkflowFilterOperator = (typeof WORKFLOW_FILTER_OPERATORS)[number];

export const WORKFLOW_FORM_FIELD_TYPES = [
  "text",
  "long_text",
  "number",
  "boolean",
  "select",
  "date",
] as const;
export type WorkflowFormFieldType = (typeof WORKFLOW_FORM_FIELD_TYPES)[number];

export const WORKFLOW_DELAY_UNITS = [
  "seconds",
  "minutes",
  "hours",
  "days",
] as const;
export type WorkflowDelayUnit = (typeof WORKFLOW_DELAY_UNITS)[number];

/* ============================ primitivos ================================ */

/**
 * Valor de campo: literal ou expressão `{{path}}` (resolvida em runtime
 * contra o contexto do run — `trigger.record`, `steps.<alias>.output`, etc.).
 * Mantemos como string crua aqui; o resolver/executor faz parsing.
 */
const ExpressionSchema = z.string().max(5000);

/** name → expressão. Cobre `fields`, `where`, payload do form. */
const FieldMapSchema = z.record(
  z.string().trim().min(1).max(100),
  ExpressionSchema,
);

const ConditionSchema = z.object({
  field: ExpressionSchema,
  operator: z.enum(WORKFLOW_FILTER_OPERATORS),
  value: ExpressionSchema.optional().default(""),
});

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const NodeIdSchema = z.string().trim().min(1).max(64);
const EdgeIdSchema = z.string().trim().min(1).max(128);
const LabelSchema = z.string().trim().max(120).optional();
const AliasSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]{0,49}$/i, "Alias inválido (use letras/números/_)")
  .max(50)
  .optional();

/* =============================== triggers =============================== */

/**
 * Trigger é o nó-raiz fixo (id="trigger"). `data` null = trigger vazio
 * (estado inicial do workflow em DRAFT). Quando preenchido, o tipo
 * discrimina o payload.
 */
const TriggerRecordCreatedSchema = z.object({
  type: z.literal("record-is-created"),
  entity: z.enum(WORKFLOW_ENTITIES),
});

const TriggerRecordUpdatedSchema = z.object({
  type: z.literal("record-is-updated"),
  entity: z.enum(WORKFLOW_ENTITIES),
  /** Lista de campos observados. Vazio = qualquer campo. */
  fields: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
});

const TriggerRecordDeletedSchema = z.object({
  type: z.literal("record-is-deleted"),
  entity: z.enum(WORKFLOW_ENTITIES),
});

const TriggerRecordCreatedOrUpdatedSchema = z.object({
  type: z.literal("record-is-created-or-updated"),
  entity: z.enum(WORKFLOW_ENTITIES),
  fields: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
});

const TriggerManualSchema = z.object({
  type: z.literal("launch-manually"),
  /** Campos do payload de entrada (formulário do botão "Run"). */
  inputs: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(50),
        label: z.string().trim().max(100).optional(),
        type: z.enum(WORKFLOW_FORM_FIELD_TYPES).default("text"),
        required: z.boolean().default(false),
      }),
    )
    .max(20)
    .default([]),
});

const TriggerScheduleSchema = z.object({
  type: z.literal("on-a-schedule"),
  /** Cron 5-campos. Resolver/scheduler valida sintaxe. */
  cron: z.string().trim().min(1).max(120),
  timezone: z.string().trim().max(64).default("UTC"),
});

const TriggerWebhookSchema = z.object({
  type: z.literal("webhook"),
  /** Token público da URL `/api/workflows/webhook/<token>`. Server-issued. */
  token: z.string().trim().min(8).max(64),
});

export const WorkflowTriggerDataSchema = z.discriminatedUnion("type", [
  TriggerRecordCreatedSchema,
  TriggerRecordUpdatedSchema,
  TriggerRecordDeletedSchema,
  TriggerRecordCreatedOrUpdatedSchema,
  TriggerManualSchema,
  TriggerScheduleSchema,
  TriggerWebhookSchema,
]);

export const WorkflowTriggerSchema = z.object({
  id: z.literal("trigger"),
  position: PositionSchema,
  /** null = trigger vazio (workflow recém-criado, ainda em DRAFT). */
  data: WorkflowTriggerDataSchema.nullable(),
});

/* ================================ nodes ================================= */

const BaseNodeMixin = {
  label: LabelSchema,
  /** Nome usado em `{{steps.<alias>.output}}`. */
  outputAlias: AliasSchema,
};

const CreateRecordDataSchema = z.object({
  type: z.literal("create-record"),
  entity: z.enum(WORKFLOW_ENTITIES),
  fields: FieldMapSchema.default({}),
  ...BaseNodeMixin,
});

const UpdateRecordDataSchema = z.object({
  type: z.literal("update-record"),
  entity: z.enum(WORKFLOW_ENTITIES),
  recordId: ExpressionSchema,
  fields: FieldMapSchema.default({}),
  ...BaseNodeMixin,
});

const DeleteRecordDataSchema = z.object({
  type: z.literal("delete-record"),
  entity: z.enum(WORKFLOW_ENTITIES),
  recordId: ExpressionSchema,
  ...BaseNodeMixin,
});

const SearchRecordsDataSchema = z.object({
  type: z.literal("search-records"),
  entity: z.enum(WORKFLOW_ENTITIES),
  conditions: z.array(ConditionSchema).max(20).default([]),
  limit: z.number().int().min(1).max(500).default(50),
  ...BaseNodeMixin,
});

const CreateOrUpdateRecordDataSchema = z.object({
  type: z.literal("create-or-update-record"),
  entity: z.enum(WORKFLOW_ENTITIES),
  /** Campo usado pra upsert. Ex.: domain em company, emails[0] em person. */
  lookupField: z.string().trim().min(1).max(100),
  lookupValue: ExpressionSchema,
  fields: FieldMapSchema.default({}),
  ...BaseNodeMixin,
});

const IteratorDataSchema = z.object({
  type: z.literal("iterator"),
  /** Expressão que resolve para array (ex.: `{{steps.search_1.output}}`). */
  source: ExpressionSchema,
  /** Alias do item corrente — usado dentro do loop como `{{item}}`. */
  itemAlias: z.string().trim().min(1).max(50).default("item"),
  ...BaseNodeMixin,
});

const FilterDataSchema = z.object({
  type: z.literal("filter"),
  /** Continua execução só se todas as condições baterem. */
  conditions: z.array(ConditionSchema).max(20).default([]),
  ...BaseNodeMixin,
});

const IfElseDataSchema = z.object({
  type: z.literal("if-else"),
  /** Avalia conjuntivamente; ramo `true`/`false` via sourceHandle das edges. */
  conditions: z.array(ConditionSchema).max(20).default([]),
  ...BaseNodeMixin,
});

const DelayDataSchema = z.object({
  type: z.literal("delay"),
  amount: z.number().int().min(1).max(100_000),
  unit: z.enum(WORKFLOW_DELAY_UNITS).default("minutes"),
  ...BaseNodeMixin,
});

const SendEmailDataSchema = z.object({
  type: z.literal("send-email"),
  to: ExpressionSchema,
  subject: ExpressionSchema,
  /** Corpo em HTML (ou expressão que produz HTML). */
  body: ExpressionSchema,
  /** Opcional: usa template salvo como base. */
  templateId: z.string().trim().min(1).max(64).optional(),
  ...BaseNodeMixin,
});

const DraftEmailDataSchema = z.object({
  type: z.literal("draft-email"),
  to: ExpressionSchema,
  subject: ExpressionSchema,
  body: ExpressionSchema,
  templateId: z.string().trim().min(1).max(64).optional(),
  ...BaseNodeMixin,
});

const FormFieldSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{0,49}$/i, "Nome inválido")
    .max(50),
  label: z.string().trim().max(120).optional(),
  type: z.enum(WORKFLOW_FORM_FIELD_TYPES).default("text"),
  required: z.boolean().default(false),
  /** Para `select`. */
  options: z.array(z.string().max(120)).max(50).optional(),
});

const FormDataSchema = z.object({
  type: z.literal("form"),
  /** Quem deve preencher (expressão → userId). Vazio = qualquer membro. */
  assigneeId: ExpressionSchema.optional(),
  title: z.string().trim().max(200).default("Preencha o formulário"),
  fields: z.array(FormFieldSchema).min(1).max(20),
  ...BaseNodeMixin,
});

export const WorkflowNodeDataSchema = z.discriminatedUnion("type", [
  CreateRecordDataSchema,
  UpdateRecordDataSchema,
  DeleteRecordDataSchema,
  SearchRecordsDataSchema,
  CreateOrUpdateRecordDataSchema,
  IteratorDataSchema,
  FilterDataSchema,
  IfElseDataSchema,
  DelayDataSchema,
  SendEmailDataSchema,
  DraftEmailDataSchema,
  FormDataSchema,
]);

export const WorkflowNodeSchema = z.object({
  id: NodeIdSchema,
  position: PositionSchema,
  data: WorkflowNodeDataSchema,
});

/* ================================ edges ================================= */

export const WorkflowEdgeSchema = z.object({
  id: EdgeIdSchema,
  source: NodeIdSchema.or(z.literal("trigger")),
  target: NodeIdSchema,
  /** Para if-else: "true" | "false". Para outros: omitido. */
  sourceHandle: z.string().max(32).optional(),
  label: z.string().max(60).optional(),
});

/* ============================ definition ================================ */

/**
 * Forma do JSON salvo em `WorkflowVersion.definition`. Validamos na fronteira
 * (route + mapper) — DB guarda Json cru.
 */
export const WorkflowDefinitionSchema = z
  .object({
    trigger: WorkflowTriggerSchema,
    nodes: z.array(WorkflowNodeSchema).max(200).default([]),
    edges: z.array(WorkflowEdgeSchema).max(500).default([]),
  })
  .superRefine((def, ctx) => {
    const nodeIds = new Set<string>(["trigger"]);
    for (const node of def.nodes) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Node id duplicado: ${node.id}`,
          path: ["nodes"],
        });
      }
      nodeIds.add(node.id);
    }
    for (const edge of def.edges) {
      if (!nodeIds.has(edge.source)) {
        ctx.addIssue({
          code: "custom",
          message: `Edge ${edge.id}: source desconhecido (${edge.source})`,
          path: ["edges"],
        });
      }
      if (!nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: "custom",
          message: `Edge ${edge.id}: target desconhecido (${edge.target})`,
          path: ["edges"],
        });
      }
    }
  });

/* =========================== workflow CRUD =============================== */

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe um nome")
  .max(200, "Nome muito longo");
const DescriptionSchema = z.string().trim().max(2000);

export const CreateWorkflowSchema = z.object({
  name: NameSchema,
  description: DescriptionSchema.optional(),
});

export const UpdateWorkflowSchema = z
  .object({
    name: NameSchema,
    description: DescriptionSchema.nullable(),
    status: z.enum(WORKFLOW_STATUSES),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

/** Patch que o editor envia a cada alteração no canvas (autosave). */
export const UpdateWorkflowDraftSchema = z.object({
  definition: WorkflowDefinitionSchema,
});

/** Disparo manual via botão "Test" ou trigger "launch-manually". */
export const TriggerManualRunSchema = z.object({
  payload: z.record(z.string(), z.unknown()).default({}),
  /** true = run de teste (não dispara side-effects irreversíveis). */
  test: z.boolean().default(false),
});

/** Payload do submit do form pausado — name → valor. */
export const ResumeRunSchema = z.object({
  payload: z.record(z.string(), z.unknown()).default({}),
});

/* ================================ outputs =============================== */

export const WorkflowOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(WORKFLOW_STATUSES),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  activeVersionId: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const WorkflowVersionOutputSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.enum(WORKFLOW_VERSION_STATUSES),
  version: z.number().int(),
  definition: WorkflowDefinitionSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WorkflowRunStepOutputSchema = z.object({
  id: z.string(),
  runId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: z.enum(WORKFLOW_RUN_STEP_STATUSES),
  input: z.unknown(),
  output: z.unknown(),
  error: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});

export const WorkflowRunOutputSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  versionId: z.string(),
  status: z.enum(WORKFLOW_RUN_STATUSES),
  triggerType: z.enum(WORKFLOW_TRIGGER_TYPES),
  triggerPayload: z.unknown(),
  /** Quando status = WAITING, é o id do step (form) aguardando input. */
  waitingStepId: z.string().nullable(),
  startedById: z.string().nullable(),
  error: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  steps: z.array(WorkflowRunStepOutputSchema).optional(),
});

/* ================================ types ================================= */

export type WorkflowTriggerData = z.infer<typeof WorkflowTriggerDataSchema>;
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;
export type WorkflowNodeData = z.infer<typeof WorkflowNodeDataSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowCondition = z.infer<typeof ConditionSchema>;
export type WorkflowFormField = z.infer<typeof FormFieldSchema>;

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;
export type UpdateWorkflowDraftInput = z.infer<
  typeof UpdateWorkflowDraftSchema
>;
export type TriggerManualRunInput = z.infer<typeof TriggerManualRunSchema>;
export type ResumeRunInput = z.infer<typeof ResumeRunSchema>;

export type WorkflowDTO = z.infer<typeof WorkflowOutputSchema>;
export type WorkflowVersionDTO = z.infer<typeof WorkflowVersionOutputSchema>;
export type WorkflowRunDTO = z.infer<typeof WorkflowRunOutputSchema>;
export type WorkflowRunStepDTO = z.infer<typeof WorkflowRunStepOutputSchema>;
