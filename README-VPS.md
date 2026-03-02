# Impera VPS Deployment

This project is configured for deployment on a private VPS with the domain `impera-app.ru`.

## Quick Start on VPS

1. **Setup Environment**:
   ```bash
   bash scripts/vps-setup.sh
   ```

2. **Configure Variables**:
   Create `server/.env` and add:
   - `DATABASE_URL` (PostgreSQL)
   - `TELEGRAM_BOT_TOKEN`
   - `WEB_APP_URL=https://impera-app.ru`
   - `JWT_SECRET`

3. **Deploy**:
   ```bash
   bash scripts/deploy.sh
   ```

## Nginx Configuration (Example)
The Mini App is served from `client/dist` and API is proxied to port 3001.

```nginx
server {
    server_name impera-app.ru;
    root /var/www/impera/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
