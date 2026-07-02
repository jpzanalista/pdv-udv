#!/usr/bin/env bash
# DEV (sua máquina): builda a imagem localmente (CPU rápida) e envia ao GHCR.
# A VPS depois só BAIXA (bash deploy.sh) — sem buildar no servidor lento.
# Pré-requisito (1x): docker login ghcr.io -u jpzanalista   (token com write:packages)
set -euo pipefail
cd "$(dirname "$0")"

echo "== build da imagem (local) =="
docker compose -f docker-compose.prod.yml build

echo "== push para o GHCR =="
docker compose -f docker-compose.prod.yml push

echo "✅ Imagem no GHCR. Agora na VPS: cd /root/pdv-udv && bash deploy.sh"
