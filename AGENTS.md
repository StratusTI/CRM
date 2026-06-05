<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pagamentos & Assinaturas (AbacatePay v2)

- **Skill AbacatePay:** `.claude/skills/abacatepay/` (regras, exemplos TS e referência da API). É descoberta automaticamente pelo Claude Code. _Obs.: `.claude/` está no `.gitignore` — a skill é local._
- **Catálogo de planos (single source of truth):** `src/config/plans.ts`. Free, Pro, Scale (cobráveis) + Enterprise (sob consulta). Preços em **centavos de BRL** (igual ao campo `price` do AbacatePay). Anual = mensal × 12 × 0,8 (20% off).
- **Assinatura da workspace:** modelo Prisma `Subscription` (1:1, ausente ⇒ Free). Backend em `src/{schemas,repositories,mappers,services}/subscription*`. Visível **somente ao OWNER** (`resolveOwnerWorkspaceId`). Endpoint `GET/POST /api/workspaces/[slug]/subscription`.
- **Contrato de produto:** `abacateExternalId(planId, cycle)` → `plan_<id>_<cycle>`; IDs `prod_…` por plano/ciclo em `abacateProductId()` (`src/config/plans.ts`).
- **Pagamento (cartão):** `SubscriptionService.changePlan` cria um checkout no AbacatePay (`src/lib/abacate/client.ts`, `methods: ["CARD"]`) e retorna `checkoutUrl`; o plano só muda quando o webhook confirma. **Free** troca na hora; **Enterprise** é bloqueado (sob consulta). _Pix recorrente exigiria "PIX Automático" na loja — fora de escopo._
- **Webhook:** `POST /api/payment/webhook` (público no middleware). Valida `?webhookSecret=` + HMAC opcional (`src/lib/abacate/webhook.ts`) e, no evento `billing.paid`, ativa a assinatura via `SubscriptionService.activateFromWebhook` (idempotente).
- **Env:** `ABACATEPAY_API_KEY` (define ambiente Dev/Prod) e `ABACATEPAY_WEBHOOK_SECRET` (mesmo valor do `?webhookSecret=` do dashboard), em `lib/env/_server.ts`.
