#!/bin/bash
# VPS Setup Script for Impera Project
# Run as root: curl -sL https://raw.githubusercontent.com/.../setup.sh | bash

set -e

echo "🚀 Starting Impera VPS Setup..."

# 1. Update system
apt update && apt upgrade -y

# 2. Install dependencies
apt install -y curl wget git build-essential nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# 3. Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Install PM2
npm install -g pm2

# 5. Setup PostgreSQL (if needed, otherwise user can use existing DB)
# For now, just ensuring it's running
systemctl start postgresql
systemctl enable postgresql

# 6. Create project directory
mkdir -p /var/www/impera
chown -R $USER:$USER /var/www/impera

echo "✅ Basic environment ready!"
echo "Next steps:"
echo "1. Clone your repo to /var/www/impera"
echo "2. Create .env files"
echo "3. Run deployment script"
