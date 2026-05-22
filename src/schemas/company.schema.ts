import { z } from "zod";
import { normalizedUrl } from "@/src/schemas/shared";

/** Contrato da feature Company (create / update / list / get / soft-delete). */

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/**
 * Domínio do site da empresa (ex.: "acme.com"). Aceita uma URL colada
 * (`https://www.acme.com/sobre`) e normaliza para o host puro em minúsculas.
 */
export const CompanyDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform(
    (value) =>
      value
        .replace(/^https?:\/\//, "") // protocolo
        .replace(/^www\./, "") // subdomínio www
        .replace(/[/?#].*$/, "") // caminho/query/hash
        .replace(/:\d+$/, ""), // porta
  )
  .pipe(
    z
      .string()
      .max(253, "Domínio muito longo")
      .regex(DOMAIN_REGEX, "Informe um domínio válido (ex.: acme.com)"),
  );

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da empresa")
  .max(200, "Nome muito longo");

const EmployeesSchema = z
  .int("Quantidade de funcionários inválida")
  .nonnegative("Quantidade de funcionários não pode ser negativa")
  .max(10_000_000, "Quantidade de funcionários fora do limite");

const LinkedinSchema = normalizedUrl("Informe uma URL de LinkedIn válida", 500);

const AddressSchema = z.string().trim().max(500, "Endereço muito longo");

const ArrSchema = z
  .number("ARR inválido")
  .nonnegative("ARR não pode ser negativo")
  .max(1_000_000_000_000, "ARR fora do limite");

/** id (cuid) de um usuário referenciado (account owner). */
const UserIdSchema = z.string().trim().min(1);

export const CreateCompanySchema = z.object({
  name: NameSchema,
  domain: CompanyDomainSchema.optional(),
  employees: EmployeesSchema.optional(),
  linkedin: LinkedinSchema.optional(),
  address: AddressSchema.optional(),
  arr: ArrSchema.optional(),
  icp: z.boolean().optional().default(false),
  accountOwnerId: UserIdSchema.optional(),
});

/**
 * Atualização parcial. Campos opcionais aceitam `null` para limpar o valor;
 * `name` e `icp` não podem ser nulificados.
 */
export const UpdateCompanySchema = z
  .object({
    name: NameSchema,
    domain: CompanyDomainSchema.nullable(),
    employees: EmployeesSchema.nullable(),
    linkedin: LinkedinSchema.nullable(),
    address: AddressSchema.nullable(),
    arr: ArrSchema.nullable(),
    icp: z.boolean(),
    accountOwnerId: UserIdSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const CompanyOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string().nullable(),
  employees: z.number().nullable(),
  linkedin: z.string().nullable(),
  address: z.string().nullable(),
  arr: z.number().nullable(),
  icp: z.boolean(),
  workspaceId: z.string(),
  createdById: z.string(),
  accountOwnerId: z.string().nullable(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
export type CompanyDTO = z.infer<typeof CompanyOutputSchema>;
