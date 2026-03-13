#!/bin/bash
# ============================================================
# IMPERA Staging Setup — run ONCE on VPS
# Usage: bash /var/www/impera/deploy/staging-setup.sh
# ============================================================
set -e

echo "========================================="
echo "  IMPERA Staging Setup"
echo "========================================="

STAGING_DIR="/var/www/impera-staging"
PROD_DIR="/var/www/impera"

# 1. Clone staging from the same repo
if [ -d "$STAGING_DIR" ]; then
  echo "⚠️  $STAGING_DIR already exists, pulling latest..."
  cd "$STAGING_DIR" && git pull
else
  echo "📦 Cloning repo to staging..."
  git clone https://github.com/5kaBez/IMPERA.git "$STAGING_DIR"
fi

cd "$STAGING_DIR"

# 2. Install Python dependencies for auto-import
echo "🐍 Installing Python dependencies..."
pip3 install pandas openpyxl 2>/dev/null || pip install pandas openpyxl

# 3. Create staging database
echo "🗄️  Creating staging database..."
sudo -u postgres psql -c "CREATE DATABASE impera_staging;" 2>/dev/null || echo "   DB already exists"

# 4. Create .env for staging
echo "📝 Creating staging .env..."
cat > "$STAGING_DIR/server/.env" << 'ENVEOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/impera_staging"
JWT_SECRET="impera-staging-secret-2026"
TELEGRAM_BOT_TOKEN="8697715037:AAF4FQ0X_EK9y9v6OhMU9GOkMCLHzBzJkSw"
PORT=3002
NODE_ENV=staging
WEB_APP_URL=https://staging.impera-app.ru/
ENVEOF

# 5. Install dependencies & build
echo "📦 Installing server dependencies..."
cd "$STAGING_DIR/server"
npm install

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🗄️  Pushing schema to staging DB..."
npx prisma db push --accept-data-loss

echo "🏗️  Building server..."
npm run build

echo "📦 Installing client dependencies..."
cd "$STAGING_DIR/client"
npm install

echo "🏗️  Building client..."
npm run build

# 6. Start staging with PM2
echo "🚀 Starting staging server..."
cd "$STAGING_DIR"
pm2 start ecosystem.config.js --only impera-staging 2>/dev/null || \
  pm2 restart impera-staging
pm2 save

# 7. Setup nginx
echo "🌐 Setting up nginx for staging..."
NGINX_CONF="/etc/nginx/sites-available/impera-staging"
cat > "$NGINX_CONF" << 'NGINXEOF'
server {
    listen 80;
    server_name staging.impera-app.ru;

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location / {
        root /var/www/impera-staging/client/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
            expires 7d;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINXEOF

# Enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/impera-staging 2>/dev/null || true
nginx -t && systemctl reload nginx

echo ""
echo "========================================="
echo "  ✅ Staging setup complete!"
echo "========================================="
echo ""
echo "  Staging URL:  http://staging.impera-app.ru"
echo "  Server port:  3002"
echo "  Database:     impera_staging"
echo "  PM2 name:     impera-staging"
echo ""
echo "  Next steps:"
echo "  1. Add DNS A record: staging.impera-app.ru -> 155.212.246.88"
echo "  2. Get SSL: certbot --nginx -d staging.impera-app.ru"
echo "  3. Set Mini App URL in @BotFather for test bot"
echo ""
