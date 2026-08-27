# No Gas Labs AI Guild Platform

> **A rollback-first, fail-closed read-only platform baseline.**

## Current status

This repository contains an Express backend, an incomplete frontend/mobile surface, data-client code, and multiple prototype/demo route modules. The `manus/ai-platform-production-readiness-20260827` branch makes the active backend **safe to start only as a read-only platform boundary**. It does not make repository scanning, autonomous maintenance, agent execution, prototype generation, notifications, deployments, data mutation, wallet operations, or external AI/tool use operational.

| Area | Current production-baseline contract |
| --- | --- |
| Server startup | Production configuration fails closed without a strong JWT secret, explicit CORS origins, database/Redis connection settings, and read-only mode. |
| Public routes | Only `/health` and `/ready` are public. `/ready` returns non-secret configuration status. |
| Operational API | All `/api/*` paths are disabled with a safe `503 read_only_baseline` response. |
| Identity routes | Registration, login, identity lookup, and refresh are unavailable while the baseline is read-only. A fallback JWT secret is removed. |
| Uploads | The legacy public `/uploads` static mount is disabled. Public uploads cannot be enabled in this production baseline. |
| Data clients | PostgreSQL and Redis clients are configured without connection on module import. Automatic schema initialization is disabled. |
| Mock/demo modules | Demo routes are not mounted by the active server and are not production capabilities. |
| External actions | No repository, deployment, provider, wallet, database, notification, or AI action is automatically enabled. |

## Safe local validation

The backend validation suite exercises configuration and the read-only HTTP boundary without connecting to PostgreSQL, Redis, GitHub, AI providers, or any other external system.

```bash
cd backend
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm test
```

A production-shaped preflight needs placeholder values only; it must not use a real secret or endpoint in a local command history:

```bash
NODE_ENV=production \
APP_READ_ONLY=true \
APP_CORS_ORIGINS='https://console.example.test' \
JWT_SECRET='non-secret-validation-value-at-least-32-characters' \
DB_HOST='db.example.test' DB_NAME='guild' DB_USER='guild_user' DB_PASSWORD='non-secret-validation-password' \
REDIS_HOST='redis.example.test' \
node -e "require('./runtime-config').loadRuntimeConfig(); console.log('configuration_valid')"
```

The service does not run database migrations automatically. The historic database initialization path is deliberately blocked until an approved schema, migration, backup, least-privilege credential, and ownership plan exists.

## Configuration

The production contract is intentionally strict.

| Variable | Purpose | Production requirement |
| --- | --- | --- |
| `NODE_ENV` | Runtime environment. | `production` for a production release. |
| `APP_READ_ONLY` | Allows only the safe baseline. | Must be `true` on this branch. |
| `APP_CORS_ORIGINS` | Comma-separated browser origins. | Required; absolute HTTP(S) origins only. |
| `JWT_SECRET` | Token signing material. | Required, non-placeholder, at least 32 characters, platform-managed only. |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | Future Postgres configuration. | Required in production but no connection/migration is automatically made. |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Future Redis configuration. | Host required in production; client is lazy and disconnected by default. |
| `APP_BODY_LIMIT_BYTES` | Maximum parsed body size. | Default 1 MiB; maximum 10 MiB. |
| `APP_RATE_LIMIT_WINDOW_MS`, `APP_RATE_LIMIT_MAX` | In-process API rate control. | Bounded configuration; not a distributed limiter. |
| `ENABLE_PUBLIC_UPLOADS` | Historic public file surface. | Must not be `true` on this branch. |

Do not rely on the tracked legacy `.env` files for production. They are historical configuration artifacts, are not loaded by the active server, and must be replaced by platform-managed values only after an approved secret lifecycle exists.

## Remaining production gates

This branch is **not a deployment**. An authorized owner must still approve the default-branch merge, platform/TLS/network design, secret issuance and rotation, database/Redis provisioning and migration plan, role-based authorization policy, route-by-route action approvals, observability/incident response, upload/media policy, dependency review, and tests against the chosen infrastructure.

The project must not claim actual autonomous agent management, repository mutation, AI inference, model/tool execution, notifications, deployment, mobile distribution, or real-time operations until a separately reviewed implementation and end-to-end evidence exist.

## Rollback

No default branch was modified. Before merge, close the review or delete the rollback branch after retaining the change record. After an explicitly approved merge, create a new branch from the then-current default branch and use `git revert <hardening-commit>` for review. Do not restore the fallback JWT secret, re-enable public uploads, or disable read-only mode as a rollback shortcut.
