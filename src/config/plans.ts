import { z } from "zod";

/**
 * Catálogo de planos — single source of truth.
 *
 * Importado tanto pela UI (página de planos / gating de features) quanto pelo
 * serviço de pagamento (AbacatePay v2). Preços ficam em **centavos de BRL**
 * para casar com o campo `price` da API do AbacatePay (sempre em centavos).
 *
 * São 3 planos cobráveis (Free, Pro, Scale) + Enterprise sob consulta.
 * O ciclo anual aplica 20% de desconto sobre 12x o mensal.
 */

export const PLAN_IDS = ["free", "pro", "scale", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export const PlanIdSchema = z.enum(PLAN_IDS);

/** Ordem de exibição (do mais barato ao mais completo). */
export const PLAN_ORDER: readonly PlanId[] = PLAN_IDS;

export const BILLING_CYCLES = ["monthly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];
export const BillingCycleSchema = z.enum(BILLING_CYCLES);

/** Sentinela para limite ilimitado (evita `null` em campos numéricos). */
export const UNLIMITED = -1;
export function isUnlimited(value: number): boolean {
  return value === UNLIMITED;
}

/** Desconto do ciclo anual: preço anual = mensal × 12 × (1 − taxa). */
export const ANNUAL_DISCOUNT_RATE = 0.2;

/** Calcula o preço anual (centavos) a partir do mensal já com o desconto. */
function computeYearly(priceMonthly: number): number {
  return Math.round(priceMonthly * 12 * (1 - ANNUAL_DISCOUNT_RATE));
}

/** Limites quantitativos por workspace. `UNLIMITED` (−1) = sem teto. */
export interface PlanLimits {
  /** Assentos (membros) na workspace. */
  seats: number;
  /** Registros de CRM (empresas + pessoas + oportunidades). */
  records: number;
  /** Pipelines de vendas customizáveis. */
  pipelines: number;
  /** Conexões de redes sociais ativas. */
  socialConnections: number;
  /** Posts agendados criados por mês. */
  scheduledPostsPerMonth: number;
  /** Envios de e-mail (campanhas) por mês. */
  emailSendsPerMonth: number;
  /** Automações (workflows) ativas. */
  workflows: number;
  /** Dashboards customizados. */
  dashboards: number;
  /** Landing pages publicadas. */
  landingPages: number;
  /** Formulários de captação. */
  forms: number;
  /** Definições de campos customizados. */
  customFields: number;
  /** Créditos do assistente de IA por mês. */
  aiCreditsPerMonth: number;
}

/** Flags de capacidades (liga/desliga features inteiras). */
export interface PlanFeatures {
  aiAssistant: boolean;
  workflows: boolean;
  socialPublishing: boolean;
  landingPages: boolean;
  forms: boolean;
  customFields: boolean;
  /** Chaves de API server-to-server. */
  apiAccess: boolean;
  /** Previsão de receita (forecast). */
  forecast: boolean;
  /** Log de auditoria / timeline. */
  auditLog: boolean;
  prioritySupport: boolean;
  /** Single sign-on (somente Enterprise). */
  sso: boolean;
}

export type PlanCta = "free" | "checkout" | "contact";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  /** Preço mensal em centavos (BRL). `null` = sob consulta (Enterprise). */
  priceMonthly: number | null;
  /** Preço anual em centavos (BRL), já com 20% off. `null` = sob consulta. */
  priceYearly: number | null;
  /** Ação do botão na página de planos. */
  cta: PlanCta;
  /** Selo de destaque (ex.: "Mais popular"). */
  badge?: string;
  /** Bullets exibidos no card do plano. */
  highlights: string[];
  limits: PlanLimits;
  features: PlanFeatures;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Para começar e organizar seu funil.",
    priceMonthly: 0,
    priceYearly: 0,
    cta: "free",
    highlights: [
      "Até 2 membros",
      "1.000 registros de CRM",
      "1 pipeline",
      "50 créditos de IA/mês",
    ],
    limits: {
      seats: 2,
      records: 1_000,
      pipelines: 1,
      socialConnections: 1,
      scheduledPostsPerMonth: 10,
      emailSendsPerMonth: 200,
      workflows: 0,
      dashboards: 1,
      landingPages: 1,
      forms: 1,
      customFields: 5,
      aiCreditsPerMonth: 50,
    },
    features: {
      aiAssistant: true,
      workflows: false,
      socialPublishing: true,
      landingPages: true,
      forms: true,
      customFields: true,
      apiAccess: false,
      forecast: false,
      auditLog: false,
      prioritySupport: false,
      sso: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Para times de vendas em crescimento.",
    priceMonthly: 9_700,
    priceYearly: computeYearly(9_700),
    cta: "checkout",
    badge: "Mais popular",
    highlights: [
      "Até 10 membros",
      "25.000 registros de CRM",
      "Automações e forecast",
      "2.000 créditos de IA/mês",
    ],
    limits: {
      seats: 10,
      records: 25_000,
      pipelines: 5,
      socialConnections: 5,
      scheduledPostsPerMonth: 500,
      emailSendsPerMonth: 10_000,
      workflows: 20,
      dashboards: 10,
      landingPages: 10,
      forms: 10,
      customFields: 50,
      aiCreditsPerMonth: 2_000,
    },
    features: {
      aiAssistant: true,
      workflows: true,
      socialPublishing: true,
      landingPages: true,
      forms: true,
      customFields: true,
      apiAccess: true,
      forecast: true,
      auditLog: false,
      prioritySupport: false,
      sso: false,
    },
  },
  scale: {
    id: "scale",
    name: "Scale",
    tagline: "Para operações que precisam de escala.",
    priceMonthly: 29_700,
    priceYearly: computeYearly(29_700),
    cta: "checkout",
    highlights: [
      "Até 50 membros",
      "250.000 registros de CRM",
      "Pipelines e automações ilimitados",
      "Log de auditoria e suporte prioritário",
    ],
    limits: {
      seats: 50,
      records: 250_000,
      pipelines: UNLIMITED,
      socialConnections: UNLIMITED,
      scheduledPostsPerMonth: UNLIMITED,
      emailSendsPerMonth: 100_000,
      workflows: UNLIMITED,
      dashboards: UNLIMITED,
      landingPages: UNLIMITED,
      forms: UNLIMITED,
      customFields: UNLIMITED,
      aiCreditsPerMonth: 10_000,
    },
    features: {
      aiAssistant: true,
      workflows: true,
      socialPublishing: true,
      landingPages: true,
      forms: true,
      customFields: true,
      apiAccess: true,
      forecast: true,
      auditLog: true,
      prioritySupport: true,
      sso: false,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Para grandes equipes com necessidades específicas.",
    priceMonthly: null,
    priceYearly: null,
    cta: "contact",
    highlights: [
      "Membros e registros ilimitados",
      "SSO e controles avançados",
      "Suporte dedicado e SLA",
      "Limites e contrato sob medida",
    ],
    limits: {
      seats: UNLIMITED,
      records: UNLIMITED,
      pipelines: UNLIMITED,
      socialConnections: UNLIMITED,
      scheduledPostsPerMonth: UNLIMITED,
      emailSendsPerMonth: UNLIMITED,
      workflows: UNLIMITED,
      dashboards: UNLIMITED,
      landingPages: UNLIMITED,
      forms: UNLIMITED,
      customFields: UNLIMITED,
      aiCreditsPerMonth: UNLIMITED,
    },
    features: {
      aiAssistant: true,
      workflows: true,
      socialPublishing: true,
      landingPages: true,
      forms: true,
      customFields: true,
      apiAccess: true,
      forecast: true,
      auditLog: true,
      prioritySupport: true,
      sso: true,
    },
  },
};

/** Lista ordenada das definições (conveniência para a UI). */
export const PLAN_LIST: readonly PlanDefinition[] = PLAN_ORDER.map(
  (id) => PLANS[id],
);

export function getPlan(id: PlanId): PlanDefinition {
  return PLANS[id];
}

/** Preço (centavos) do plano no ciclo dado. `null` = sob consulta. */
export function priceFor(id: PlanId, cycle: BillingCycle): number | null {
  const plan = PLANS[id];
  return cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
}

/** Plano é cobrável via AbacatePay (tem preço e CTA de checkout)? */
export function isBillable(id: PlanId): boolean {
  return PLANS[id].cta === "checkout";
}

/**
 * `externalId` estável do produto no AbacatePay, no formato `plan_<id>_<cycle>`.
 * Contrato compartilhado com o serviço de pagamento ao criar/buscar produtos.
 */
export function abacateExternalId(id: PlanId, cycle: BillingCycle): string {
  return `plan_${id}_${cycle}`;
}

/**
 * IDs dos produtos gerados no AbacatePay (`prod_…`), por plano cobrável e ciclo.
 *
 * ⚠️ São **específicos do ambiente** AbacatePay: a chave Dev e a de Produção
 * geram IDs diferentes. Ao promover para produção, atualize este mapa (ou
 * mova-o para variáveis de ambiente). A busca canônica continua sendo por
 * `abacateExternalId` (estável entre ambientes); este mapa é um atalho para
 * referenciar o produto direto, sem um GET extra na API.
 */
export const ABACATE_PRODUCT_IDS: Partial<
  Record<PlanId, Partial<Record<BillingCycle, string>>>
> = {
  pro: {
    monthly: "prod_JzTwWDcBgPS5ZrmSgXJ3t0Ab",
    yearly: "prod_eJXTcxSSSEUBXyHFyjHcghGd",
  },
  scale: {
    monthly: "prod_XAzJAZbR4ScWSwfFbfrfACLX",
    yearly: "prod_FDaGPQenRyN5yJS1xkAJFB51",
  },
};

/** ID do produto no AbacatePay para o plano/ciclo, ou `null` se não cadastrado. */
export function abacateProductId(
  id: PlanId,
  cycle: BillingCycle,
): string | null {
  return ABACATE_PRODUCT_IDS[id]?.[cycle] ?? null;
}

/** `true` se `current` ainda cabe no `limit` (respeita `UNLIMITED`). */
export function withinLimit(limit: number, current: number): boolean {
  return isUnlimited(limit) || current < limit;
}

/**
 * Plano cobrável mais enxuto que comporta `seats` assentos. Cai no maior plano
 * cobrável (Scale) quando o número excede todos — Enterprise é sob consulta e
 * não entra na recomendação automática. Usado pelo slider da página de planos.
 */
export function recommendPlanForSeats(seats: number): PlanId {
  const billable = PLAN_LIST.filter((p) => p.cta === "checkout");
  const fit = billable.find(
    (p) => !isUnlimited(p.limits.seats) && seats <= p.limits.seats,
  );
  return fit?.id ?? billable[billable.length - 1].id;
}

/** Formata centavos de BRL como string (ex.: 9700 → "R$ 97,00"). */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
