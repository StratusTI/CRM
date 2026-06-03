import { z } from "zod";
import { isValidCnpj, normalizeCnpj } from "@/lib/cnpj";
import { normalizeDomain, normalizedUrl } from "@/src/schemas/shared";

/** Contrato da feature Company (create / update / list / get / soft-delete). */

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/**
 * CNPJ da empresa. Aceita qualquer máscara/pontuação, valida os dígitos
 * verificadores e armazena apenas os 14 dígitos (sem formatação).
 */
export const CnpjSchema = z
  .string()
  .trim()
  .transform(normalizeCnpj)
  .refine((v) => v === "" || isValidCnpj(v), "Informe um CNPJ válido")
  .transform((v) => (v === "" ? undefined : v));

/**
 * Domínio do site da empresa (ex.: "acme.com"). Aceita uma URL colada
 * (`https://www.acme.com/sobre`) e normaliza para o host puro em minúsculas.
 */
export const CompanyDomainSchema = z
  .string()
  .transform(normalizeDomain)
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

/** Campo de texto opcional do endereço: trim + limite, vazio vira `undefined`. */
const addressText = (max: number, msg?: string) =>
  z
    .string()
    .trim()
    .max(max, msg)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

/** Coordenada opcional: aceita number ou string numérica; vazio/inválido vira `undefined`. */
const coordinate = (min: number, max: number) =>
  z.preprocess((v) => {
    if (v == null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().min(min).max(max).optional());

/**
 * Endereço estruturado da empresa. Os campos espelham o retorno do ViaCEP
 * (logradouro, bairro, localidade, uf) acrescidos de número/complemento e
 * coordenadas geográficas opcionais. Persistido como JSON.
 */
export const CompanyAddressSchema = z.object({
  cep: addressText(9, "CEP inválido"),
  street: addressText(200, "Logradouro muito longo"),
  number: addressText(20, "Número muito longo"),
  complement: addressText(120, "Complemento muito longo"),
  neighborhood: addressText(120, "Bairro muito longo"),
  city: addressText(120, "Cidade muito longa"),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .max(2, "UF inválida")
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
});

const ArrSchema = z
  .number("ARR inválido")
  .nonnegative("ARR não pode ser negativo")
  .max(1_000_000_000_000, "ARR fora do limite");

/** id (cuid) de um usuário referenciado (account owner). */
const UserIdSchema = z.string().trim().min(1);

export const CreateCompanySchema = z.object({
  // Opcional: a linha pode nascer só com o CNPJ e ter o nome preenchido pela
  // consulta à BrasilAPI logo em seguida.
  name: NameSchema.optional(),
  cnpj: CnpjSchema.optional(),
  domain: CompanyDomainSchema.optional(),
  employees: EmployeesSchema.optional(),
  linkedin: LinkedinSchema.optional(),
  address: CompanyAddressSchema.optional(),
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
    cnpj: CnpjSchema.nullable(),
    domain: CompanyDomainSchema.nullable(),
    employees: EmployeesSchema.nullable(),
    linkedin: LinkedinSchema.nullable(),
    address: CompanyAddressSchema.nullable(),
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
  cnpj: z.string().nullable(),
  domain: z.string().nullable(),
  employees: z.number().nullable(),
  linkedin: z.string().nullable(),
  address: CompanyAddressSchema.nullable(),
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

export type CompanyAddress = z.infer<typeof CompanyAddressSchema>;
export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
export type CompanyDTO = z.infer<typeof CompanyOutputSchema>;
