# PDV UDV

PDV web (PWA) para os empórios da União do Vegetal — crediário por sócio/família, multi-núcleo, integração ASAAS e autenticação via Cognito (REUNI).

> Documentos de visão/decisão ficam na pasta-pai (`../VISAO.md`, `../ASAAS.md`, `../AUTH.md`, `../STACK.md`, `../TELAS.md`).

## Stack

- **Monorepo:** Turborepo + pnpm
- **Web:** Next.js (App Router) — offline-first no desktop
- **API:** NestJS (REST) + Zod
- **Banco:** PostgreSQL + Drizzle ORM
- **Auth:** Cognito (REUNI) no backend → nosso JWT; OTP (sócios)
- **Infra:** Docker + docker-compose

## Estrutura

```
apps/
  web/   Next.js (caixa PWA + portal)
  api/   NestJS (REST, webhooks ASAAS, fechamentos)
packages/
  db/      Drizzle (schema, migrations, client)
  core/    regras de domínio (reuso web + api)
  shared/  schemas Zod, tipos, enums
  config/  tsconfig presets
```

## Começando

```bash
cp .env.example .env        # ajuste os segredos (ASAAS sandbox etc.)
pnpm install
pnpm dev                    # sobe postgres + api + web via docker-compose
```

Sem docker (na máquina):

```bash
docker compose up postgres -d
pnpm dev:host
```

## Scripts

| Script | Faz |
|--------|-----|
| `pnpm dev` | docker-compose (postgres + api + web) |
| `pnpm dev:host` | turbo dev na máquina |
| `pnpm build` | build de tudo |
| `pnpm typecheck` | typecheck |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm db:generate` / `db:migrate` / `db:studio` | Drizzle |
