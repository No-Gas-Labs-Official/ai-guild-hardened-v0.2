# Security Policy

## Current boundary

The active backend is a **read-only production baseline**. It exposes public health/readiness responses but returns a safe unavailable response for all operational API paths. The repository does not provide an approved, deployed identity, database, Redis, upload, provider, repository-mutation, notification, or agent-execution service.

## Reporting a vulnerability

Do not report credentials, tokens, endpoint values, repository data, request bodies, or exploit payloads in a public issue. Use a private maintainer channel or repository security reporting and include the affected commit, observed impact, and a safe reproduction path.

## Controls on this branch

| Area | Control |
| --- | --- |
| Startup | Production requires a strong non-placeholder JWT secret, explicit CORS origins, future data-service settings, and read-only mode. |
| JWT | The historic fallback `nogaslabs-super-secret-key` is removed. Verification is restricted to `HS256` with fixed issuer/audience. |
| API surface | Operational `/api/*` paths are disabled in read-only mode; public uploads are disabled; only health/readiness are public. |
| Data clients | PostgreSQL/Redis clients do not connect at import. Automatic schema initialization is disabled. |
| Input/errors | JSON bodies are bounded, URL-encoded nesting is disabled, request IDs are assigned, and errors are generic to callers. |
| CORS/headers | CORS is disabled unless explicit allowed origins are supplied; Helmet sets restrictive headers; credentials are not allowed cross-origin. |
| Abuse control | `/api` has in-process bounded rate limiting. |
| Logging | Logs carry request path/status/duration and request ID but not request bodies or token values. |

## Known limitations and required work

The current rate limiter is per process and not global. No deployment, backend integration, migration, database connection, role/authorization matrix, static media policy, secret rotation process, monitoring stack, or end-to-end action test exists. The legacy repository contains unmounted demo/prototype route modules; they must not be mounted or treated as real operations without a route-by-route threat model, authorization, input contract, test suite, and explicit approval.

The tracked legacy environment files are not loaded by the hardened server but should be reviewed under an approved credential-history process before a real deployment. This branch does not create, rotate, revoke, or delete any secret.
