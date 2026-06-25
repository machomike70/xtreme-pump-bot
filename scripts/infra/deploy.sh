#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/goml/xtreme-pump-bot"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building..."
pnpm build

echo "==> Pushing database schema..."
pnpm db:push

echo "==> Restarting service..."
systemctl restart xtreme-pump-bot

echo "==> Checking health..."
sleep 3
curl -sf http://localhost:8080/health | python3 -m json.tool || true

echo "==> Deploy complete!"
