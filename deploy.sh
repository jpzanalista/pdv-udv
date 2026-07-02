#!/usr/bin/env bash
# Atualiza a produção: puxa o código, rebuilda, migra e reinicia os containers.
# Uso na VPS (dentro de /root/pdv-udv):  bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "== git pull =="
git pull

echo "== build das imagens (pode levar alguns minutos) =="
docker compose -f docker-compose.prod.yml build

echo "== migração do banco (só aplica novas) =="
docker compose -f docker-compose.prod.yml run --rm -w /app api pnpm --filter @pdv-udv/db db:migrate

echo "== subindo (recria o que mudou) =="
docker compose -f docker-compose.prod.yml up -d

docker compose -f docker-compose.prod.yml ps
echo "== pronto =="
