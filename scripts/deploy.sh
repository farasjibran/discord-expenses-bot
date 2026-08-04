#!/bin/bash
# deploy.sh — Deploy discord-expense-bot to Railway (or any VPS)
# Usage: ./deploy.sh [railway|vps|local]

set -e

ENV_FILE=".env"

echo "=== Discord Expense Bot Deploy ==="
echo ""

TARGET=${1:-railway}

case $TARGET in
  railway)
    echo "[1/3] Logging in to Railway..."
    railway login

    echo "[2/3] Creating project..."
    railway create discord-expense-bot || true

    echo "[3/3] Deploying..."
    railway up --detach

    echo ""
    echo "=== Deployed! ==="
    echo "Run 'railway open' to view logs."
    echo "Run 'railway variables' to set env vars."
    ;;

  vps)
    echo "[1/3] Syncing files to VPS..."
    rsync -avz --exclude node_modules --exclude .env --exclude .git ./ user@your-vps-ip:/home/user/discord-expense-bot/

    echo "[2/3] Installing dependencies on VPS..."
    ssh user@your-vps-ip "cd /home/user/discord-expense-bot && npm install"

    echo "[3/3] Starting bot on VPS..."
    ssh user@your-vps-ip "cd /home/user/discord-expense-bot && npm start &"

    echo ""
    echo "=== Deployed to VPS! ==="
    ;;

  local)
    echo "Installing dependencies..."
    npm install

    echo ""
    echo "=== Ready to run locally! ==="
    echo "1. Copy .env.example to .env and fill in your keys"
    echo "2. Run: npm start"
    echo "3. Or for dev mode: npm run dev"
    ;;

  *)
    echo "Unknown target: $TARGET"
    echo "Usage: ./deploy.sh [railway|vps|local]"
    exit 1
    ;;
esac