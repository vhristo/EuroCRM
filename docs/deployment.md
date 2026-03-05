# Deployment Guide

This guide covers deploying EuroCRM in both development and production environments.

---

## Environment Variables Reference

All variables must be set before starting the application. Copy `.env.example` to `.env` and fill in all values.

### Application

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Set to `production` for production deployments |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Publicly accessible URL of the application. Used in email tracking links and embed codes. Must not have a trailing slash. |
| `NEXT_PUBLIC_APP_NAME` | No | `EuroCRM` | Application name shown in the UI and emails |

### MongoDB

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | Full MongoDB connection string including credentials, host, port, and database name. Example: `mongodb://admin:password@mongo:27017/eurocrm?authSource=admin` |
| `MONGO_USER` | Yes (Docker) | MongoDB root username — used by the Docker Compose `mongo` service |
| `MONGO_PASS` | Yes (Docker) | MongoDB root password — used by the Docker Compose `mongo` service |

### JWT Secrets

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Secret for signing access tokens. **Minimum 32 characters.** Use a cryptographically random string. |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing refresh tokens. **Minimum 32 characters.** Must be different from `JWT_SECRET`. |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token lifetime. Accepts formats like `15m`, `1h`, `2d`. |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token lifetime. Accepts formats like `7d`, `30d`. |

### Encryption

| Variable | Required | Description |
|---|---|---|
| `ENCRYPTION_KEY` | Yes (if using email) | AES-256-GCM encryption key for storing SMTP passwords. **Must be exactly 32 characters.** Generate with: `openssl rand -base64 24 \| head -c 32` |

If `ENCRYPTION_KEY` is not set, the application will start but creating or using email configurations will fail at runtime.

---

## Generating Secrets

```bash
# Generate JWT_SECRET (32+ characters)
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY (exactly 32 characters)
openssl rand -base64 24 | head -c 32
```

Or using Node.js:

```javascript
require('crypto').randomBytes(32).toString('base64')
```

---

## Development with Docker

The development setup provides hot reload for Next.js, local MongoDB, and does not require nginx.

### Setup

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values. For local dev, the defaults work for most fields except the secrets:

   ```env
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   MONGODB_URI=mongodb://admin:changeme@mongo:27017/eurocrm?authSource=admin
   MONGO_USER=admin
   MONGO_PASS=changeme
   JWT_SECRET=dev_jwt_secret_at_least_32_characters_long
   JWT_REFRESH_SECRET=dev_refresh_secret_at_least_32_chars_long
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   ENCRYPTION_KEY=devkey1234567890123456789012345
   ```

3. Start all services:

   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

### Services (dev)

| Service | Container | Port | Description |
|---|---|---|---|
| `app` | `eurocrm-app-dev` | 3000 | Next.js dev server with hot reload |
| `mongo` | `eurocrm-mongo-dev` | 27017 | MongoDB 7 with healthcheck |

The app mounts the project directory as a volume so changes are reflected immediately without rebuilding.

---

## Production with Docker

The production setup includes nginx as a reverse proxy.

### Setup

1. Set all environment variables (see above). **Do not use default/example values for secrets in production.**

2. Build and start:

   ```bash
   docker compose up --build -d
   ```

### Services (production)

| Service | Container | Port | Description |
|---|---|---|---|
| `app` | `eurocrm-app` | 3000 (internal) | Next.js production build |
| `mongo` | `eurocrm-mongo` | 27017 | MongoDB 7 |
| `nginx` | `eurocrm-nginx` | 80 | Nginx reverse proxy |

Traffic flows: browser → nginx:80 → app:3000

### nginx configuration

The nginx configuration is at `docker/nginx.conf`. For production with HTTPS, update the nginx config to add SSL certificates and redirect HTTP to HTTPS.

### MongoDB persistence

MongoDB data is stored in a named volume `mongo_data` which persists across container restarts. To back up:

```bash
docker exec eurocrm-mongo mongodump --out /tmp/backup --uri "mongodb://admin:$MONGO_PASS@localhost:27017/eurocrm?authSource=admin"
docker cp eurocrm-mongo:/tmp/backup ./mongo-backup
```

---

## Running without Docker

### Prerequisites

- Node.js 20+
- pnpm
- MongoDB 7 running locally or remotely

### Setup

```bash
pnpm install
cp .env.example .env.local
# Edit .env.local with all required values

pnpm build
pnpm start
```

The application will listen on port 3000 by default.

---

## First-Time Setup

After starting the application for the first time:

1. Navigate to `http://your-domain.com/register`
2. Create the first account — this user becomes the organization admin
3. Log in and configure:
   - **Settings → Pipelines**: Create your sales pipeline with stages
   - **Settings → Email**: Configure SMTP if you want to send emails
   - **Settings → API Keys**: Create API keys for integrations (if needed)
   - **Settings → Webhooks**: Register webhook endpoints (if needed)

---

## Health Check

MongoDB has a built-in healthcheck in the Docker Compose configuration:

```yaml
healthcheck:
  test: ['CMD', 'mongosh', '--eval', 'db.adminCommand("ping")']
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 20s
```

The Next.js app will not start until MongoDB is healthy.

---

## Production Checklist

Before going live:

- [ ] Set strong, unique values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY`
- [ ] Set `NODE_ENV=production`
- [ ] Set `NEXT_PUBLIC_APP_URL` to the actual public domain (used in email tracking links)
- [ ] Configure HTTPS via nginx or a load balancer
- [ ] Set MongoDB password to something strong (not `changeme`)
- [ ] Enable MongoDB authentication (`authSource=admin` in connection string)
- [ ] Set up MongoDB backups
- [ ] Review and restrict MongoDB network access (should not be publicly accessible)
- [ ] Configure SMTP for email sending
- [ ] Test SMTP with "Test Connection" in Settings → Email

---

## Updating

```bash
# Pull latest code
git pull

# Rebuild containers
docker compose up --build -d

# Or for dev:
docker compose -f docker-compose.dev.yml up --build
```

There is no database migration tooling — Mongoose applies schema changes when documents are next read or written. Index changes may require a one-time `db.collection.reIndex()` in the MongoDB shell.

---

## Logs

```bash
# View app logs
docker logs eurocrm-app -f

# View MongoDB logs
docker logs eurocrm-mongo -f

# Dev:
docker logs eurocrm-app-dev -f
```

---

## Related

- [Authentication](./auth.md) — JWT and encryption key requirements
- [Email](./features/email.md) — SMTP configuration
- [Settings](./features/settings.md) — post-deployment configuration
