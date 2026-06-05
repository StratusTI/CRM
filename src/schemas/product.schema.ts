import { z } from "zod";

/** Contrato da feature Product (catálogo de produtos/serviços). */

export const BILLING_TYPES = ["ONE_TIME", "MONTHLY", "YEARLY"] as const;

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do produto")
  .max(200, "Nome muito longo");

const SkuSchema = z.string().trim().min(1, "SKU inválido").max(60, "SKU longo");
const DescriptionSchema = z.string().trim().max(2000, "Descrição muito longa");

const UnitPriceSchema = z
  .number("Preço inválido")
  .nonnegative("Preço não pode ser negativo")
  .max(1_000_000_000_000, "Preço fora do limite");

const CurrencySchema = z
  .string()
  .trim()
  .length(3, "Use o código ISO da moeda (ex.: BRL)")
  .toUpperCase();

const BillingTypeSchema = z.enum(BILLING_TYPES);

export const CreateProductSchema = z.object({
  name: NameSchema,
  sku: SkuSchema.optional(),
  description: DescriptionSchema.optional(),
  unitPrice: UnitPriceSchema.optional().default(0),
  currency: CurrencySchema.optional().default("BRL"),
  billingType: BillingTypeSchema.optional().default("ONE_TIME"),
  active: z.boolean().optional().default(true),
});

export const UpdateProductSchema = z
  .object({
    name: NameSchema,
    sku: SkuSchema.nullable(),
    description: DescriptionSchema.nullable(),
    unitPrice: UnitPriceSchema,
    currency: CurrencySchema,
    billingType: BillingTypeSchema,
    active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const ProductOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  description: z.string().nullable(),
  unitPrice: z.number(),
  currency: z.string(),
  billingType: BillingTypeSchema,
  active: z.boolean(),
  position: z.number(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductDTO = z.infer<typeof ProductOutputSchema>;
