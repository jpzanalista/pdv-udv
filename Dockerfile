# Imagem única do monorepo (API Nest + Web Next). O compose roda cada serviço com seu comando.
FROM node:22-alpine
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# 1) Só os manifests → o layer de instalação fica em CACHE enquanto package.json/lock não mudam.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# 2) O código — só isto invalida o cache numa mudança de código (o install acima é reaproveitado).
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter "./packages/*" build && pnpm --filter "./apps/*" build

EXPOSE 3000 3333
