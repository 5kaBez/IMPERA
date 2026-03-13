#!/bin/bash
# ============================================================
# Deploy to PRODUCTION
# Usage: bash /var/www/impera/deploy/deploy-prod.sh
# ============================================================
set -e

PROD_DIR="/var/www/impera"

echo "🚀 Deploying to PRODUCTION..."
echo ""

cd "$PROD_DIR"

echo "📥 Pulling latest code..."
git pull

echo "📦 Server: prisma generate + build..."
cd "$PROD_DIR/server"
npx prisma generate
npx prisma db push --accept-data-loss
npm run build

echo "📦 Client: build..."
cd "$PROD_DIR/client"
npm run build

echo "♻️  Restarting production server..."
pm2 restart impera-server

echo ""
echo "✅ Production deployed!"
echo "   Check: pm2 logs impera-server --lines 20"
echo ""
