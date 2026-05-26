FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN --mount=type=secret,id=hugeicons_token \
    corepack enable pnpm && \
    if [ -f /run/secrets/hugeicons_token ]; then \
      echo "@hugeicons-pro:registry=https://npm.hugeicons.com" > .npmrc && \
      echo "//npm.hugeicons.com/:_authToken=$(cat /run/secrets/hugeicons_token)" >> .npmrc; \
    fi && \
    pnpm install --frozen-lockfile && \
    rm -f .npmrc

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_URL=https://nexo.coodee.dev
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL

ARG NEXT_PUBLIC_AXIOM_TOKEN
ENV NEXT_PUBLIC_AXIOM_TOKEN=$NEXT_PUBLIC_AXIOM_TOKEN

ARG NEXT_PUBLIC_AXIOM_DATASET
ENV NEXT_PUBLIC_AXIOM_DATASET=$NEXT_PUBLIC_AXIOM_DATASET

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV SKIP_ENV_VALIDATION="true"

# `prisma generate` precisa rodar antes do `next build` E o artefato precisa
# existir na árvore que será copiada pro runner. Se faltar, o erro em runtime
# vira um `DYNAMIC_SERVER_USAGE` mascarado em qualquer página que tocar o DB.
RUN corepack enable pnpm && \
    pnpm prisma generate && \
    find node_modules/.pnpm -path '*/.prisma/client/default.js' -print -quit | grep -q . && \
    pnpm next build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "start"]
