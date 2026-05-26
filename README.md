# Stell CRM

CRM multi-workspace com dashboards customizáveis, gestão de entidades (Empresas, Pessoas, Oportunidades, Tarefas, Notas) e integrações sociais (Instagram, Facebook, TikTok, YouTube, Google Analytics).

## Stack

- **Next.js 16** (App Router, React 19, `cacheComponents`) — esta é uma versão com breaking changes; consulte `node_modules/next/dist/docs/` antes de codar.
- **Prisma 7** + **PostgreSQL 17** (adapter `@prisma/adapter-pg`)
- **better-auth** (auth + plugins `@better-auth/infra` para dashboard/sentinel)
- **Base-UI** + **shadcn/ui** + **Tailwind v4**
- **TipTap 3** (editor rich-text), **Nivo** (charts), **react-grid-layout** (canvas de dashboards)
- **Biome** (lint + format), **Vitest 4** (unit / integration / e2e)

## Pré-requisitos

- Node.js 20+
- pnpm
- Docker + Docker Compose (para Postgres local)
- Arquivo `.env` na raiz (ver seção abaixo)

## Setup

```bash
pnpm install
pnpm dev
```

O script `dev` faz tudo de uma vez:

1. `docker:start` — sobe Postgres em `127.0.0.1:5433`
2. `prisma:migrate:dev` — aplica as migrations
3. `next dev` — sobe o app em `http://localhost:3000`

Na primeira execução, use `pnpm docker:create` no lugar de `pnpm docker:start` para criar os containers.

## Variáveis de ambiente

Mínimo necessário no `.env`:

```env
# Postgres
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
DATABASE_URL=postgresql://USER:PASS@localhost:5433/DB

# better-auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# Integrações sociais (opcional, por integração ativada)
META_APP_ID=...
META_APP_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Criptografia de tokens das conexões sociais
SOCIAL_TOKEN_ENCRYPTION_KEY=...
```

## Scripts

| Comando | Descrição |
|---|---|
| `pnpm dev` | Sobe infra + migrations + Next dev server |
| `pnpm build` | `prisma generate` + `next build` |
| `pnpm start` | Sobe o build em `0.0.0.0:3000` |
| `pnpm check` | Biome (lint + format com `--fix`) |
| `pnpm test` | Vitest em modo watch |
| `pnpm test:unit` / `test:integration` / `test:e2e` | Roda um projeto específico |
| `pnpm test:ci` | Roda tudo com coverage |
| `pnpm prisma:studio` | Abre Prisma Studio |
| `pnpm prisma:migrate:dev` | Cria/aplica migration de desenvolvimento |
| `pnpm docker:create` | Cria os containers pela primeira vez |
| `pnpm docker:start` / `docker:stop` | Inicia / para containers |

## Estrutura

```
app/
  (private)/         # Rotas autenticadas; [workspace-slug] é o tenant
  (public)/          # sign-in, sign-up, consent, invite
  api/               # auth, invites, social, users, workspaces, integrations
components/          # UI compartilhada (tables, dashboards, social, etc.)
src/
  repositories/      # Acesso ao Prisma — sempre retornam Result
  services/          # Regras de negócio (workspace-scoped)
  mappers/           # DB ↔ DTO
  schemas/           # Validação Zod
  hooks/             # Hooks de client (use-resource-list, etc.)
  lib/               # Utilitários (auth, criptografia, etc.)
prisma/              # schema.prisma + migrations
docs/                # Roadmap de criação de features
```

## Convenções

- **Camadas**: `route → service → repository → prisma`. Repositórios retornam `Result<T, AppError>`; services compõem.
- **Auth**: provida pelo better-auth — não rolar a mão.
- **Multi-tenant**: tudo é escopado por `workspaceSlug`; URLs privadas vivem sob `/[workspace-slug]/...`.
- **Soft delete** nas entidades CRM.
- **Testes**: banco real (`nexo_test`) para integration tests; sem Redis. Veja [docs/feature-creation-roadmap.md](./docs/feature-creation-roadmap.md) para o fluxo de criar uma feature nova.

## Deploy

A imagem oficial é publicada em `ghcr.io/stratusti/crm:latest` (ver `docker-compose.yml`). Em produção, rode `pnpm prisma:deploy` antes de subir a aplicação.
