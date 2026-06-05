import { z } from "zod";
import { BILLING_TYPES } from "@/src/schemas/product.schema";

/** Contrato dos itens (line items) de uma oportunidade. */

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do item")
  .max(200, "Nome muito longo");

const QuantitySchema = z
  .number("Quantidade inválida")
  .int("Quantidade deve ser inteira")
  .min(1, "Mínimo 1")
  .max(1_000_000, "Quantidade fora do limite");

const UnitPriceSchema = z
  .number("Preço inválido")
  .nonnegative("Preço não pode ser negativo")
  .max(1_000_000_000_000, "Preço fora do limite");

const DiscountSchema = z
  .number("Desconto inválido")
  .min(0, "Mínimo 0")
  .max(100, "Máximo 100");

const IdSchema = z.string().trim().min(1);
const BillingTypeSchema = z.enum(BILLING_TYPES);

export const CreateLineItemSchema = z.object({
  // Quando há `productId`, nome/preço/cobrança fazem snapshot do produto (mas
  // podem ser sobrescritos no payload). Sem produto, o item é avulso.
  productId: IdSchema.optional(),
  name: NameSchema.optional(),
  quantity: QuantitySchema.optional().default(1),
  unitPrice: UnitPriceSchema.optional(),
  discountPct: DiscountSchema.optional().default(0),
  billingType: BillingTypeSchema.optional(),
});

export const UpdateLineItemSchema = z
  .object({
    name: NameSchema,
    quantity: QuantitySchema,
    unitPrice: UnitPriceSchema,
    discountPct: DiscountSchema,
    billingType: BillingTypeSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const LineItemOutputSchema = z.object({
  id: z.string(),
  opportunityId: z.string(),
  productId: z.string().nullable(),
  name: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  discountPct: z.number(),
  billingType: BillingTypeSchema,
  total: z.number(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateLineItemInput = z.infer<typeof CreateLineItemSchema>;
export type UpdateLineItemInput = z.infer<typeof UpdateLineItemSchema>;
export type LineItemDTO = z.infer<typeof LineItemOutputSchema>;

/** Forma do payload ANTES dos defaults — usada no cliente (campos opcionais). */
export type CreateLineItemPayload = z.input<typeof CreateLineItemSchema>;
