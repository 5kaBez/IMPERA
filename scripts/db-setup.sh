#!/bin/bash
# Impera PostgreSQL Database Setup
# Run this on your VPS as root or sudo

set -e

DB_NAME="impera_db"
DB_USER="impera_user"
DB_PASS="impera_pass"

echo "✨ Setting up PostgreSQL database..."

# Create database and user
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true

echo "✅ Database '$DB_NAME' and user '$DB_USER' created!"
echo "Now you can run: bash scripts/deploy.sh"
