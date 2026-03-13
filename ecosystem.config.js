/**
 * PM2 Ecosystem Config
 * Production & Staging environments
 *
 * Usage:
 *   pm2 start ecosystem.config.js --only impera-server       # prod only
 *   pm2 start ecosystem.config.js --only impera-staging       # staging only
 *   pm2 start ecosystem.config.js                             # both
 */
module.exports = {
  apps: [
    {
      name: 'impera-server',
      cwd: '/var/www/impera/server',
      script: 'dist/src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_file: '/var/www/impera/server/.env',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'impera-staging',
      cwd: '/var/www/impera-staging/server',
      script: 'dist/src/index.js',
      env: {
        NODE_ENV: 'staging',
        PORT: 3002,
      },
      env_file: '/var/www/impera-staging/server/.env',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
