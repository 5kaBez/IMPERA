#!/bin/bash
# Impera Deployment Script
# Usage: ./deploy.sh

set -e

echo "📦 Deploying Impera..."

# 1. Install all dependencies
echo "Installing root dependencies..."
npm install

echo "Installing client dependencies..."
cd client && npm install --include=dev && cd ..

echo "Installing server dependencies..."
cd server && npm install && cd ..

# 2. Build the Mini App
echo "Building client..."
cd client && npm run build && cd ..

# 3. Generate Prisma client
echo "Generating Prisma client..."
cd server && npx prisma generate && cd ..

# 4. Restart services via PM2
echo "Restarting application..."
pm2 restart all || pm2 start server/src/index.ts --name impera-bot --interpreter=npx --interpreter-args=tsx

echo "✅ Deployment complete!"
