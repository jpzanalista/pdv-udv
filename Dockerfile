# Imagem única do monorepo (API Nest + Web Next). O compose roda cada serviço com seu comando.
FROM node:22-alpine
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

# NEXT_PUBLIC_* é build-time (embutido no bundle do Next).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Pacotes internos primeiro, depois as apps.
RUN pnpm --filter "./packages/*" build && pnpm --filter "./apps/*" build

EXPOSE 3000 3333
