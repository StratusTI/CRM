import { z } from "zod";

/** Contrato das chaves de API de integração (gerar / listar / revogar). */

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe um nome para a chave")
  .max(120, "Nome muito longo");

export const CreateIntegrationApiKeySchema = z.object({
  name: NameSchema,
});

/** Metadados da chave — nunca inclui o segredo. */
export const IntegrationApiKeyOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  workspaceId: z.string(),
  createdById: z.string(),
  lastUsedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
});

/** Resposta da geração: metadados + token em texto puro (exibido uma só vez). */
export const CreatedIntegrationApiKeyOutputSchema =
  IntegrationApiKeyOutputSchema.extend({
    token: z.string(),
  });

export type CreateIntegrationApiKeyInput = z.infer<
  typeof CreateIntegrationApiKeySchema
>;
export type IntegrationApiKeyDTO = z.infer<
  typeof IntegrationApiKeyOutputSchema
>;
export type CreatedIntegrationApiKeyDTO = z.infer<
  typeof CreatedIntegrationApiKeyOutputSchema
>;
