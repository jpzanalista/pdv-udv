#!/usr/bin/env bash
# VPS: baixa a imagem PRONTA do GHCR, migra e reinicia. (O build é feito na dev por deploy-registry.sh.)
# Pré-requisito (1x): docker login ghcr.io -u jpzanalista   (token com read:packages)
set -euo pipefail
cd "$(dirname "$0")"

echo "== git pull (compose/.env-example/migrações) =="
git pull

echo "== baixando a imagem do GHCR =="
docker compose -f docker-compose.prod.yml pull

echo "== migração do banco (só aplica novas) =="
docker compose -f docker-compose.prod.yml run --rm -w /app api pnpm --filter @pdv-udv/db db:migrate

echo "== subindo (recria o que mudou) =="
docker compose -f docker-compose.prod.yml up -d

docker compose -f docker-compose.prod.yml ps
echo "== pronto =="
