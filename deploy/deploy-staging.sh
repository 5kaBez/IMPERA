#!/bin/bash
# ============================================================
# Deploy to STAGING
# Usage: bash /var/www/impera/deploy/deploy-staging.sh
# ============================================================
set -e

STAGING_DIR="/var/www/impera-staging"

echo "🚀 Deploying to STAGING..."
echo ""

cd "$STAGING_DIR"

echo "📥 Pulling latest code..."
git pull

echo "📦 Server: prisma generate + build..."
cd "$STAGING_DIR/server"
npx prisma generate
npx prisma db push --accept-data-loss
npm run build

echo "📦 Client: build..."
cd "$STAGING_DIR/client"
npm run build

echo "♻️  Restarting staging server..."
pm2 restart impera-staging

echo ""
echo "✅ Staging deployed!"
echo "   Check: pm2 logs impera-staging --lines 20"
echo ""
