# No-Gas-Labs™ Ops Intelligence

A mobile-first operations dashboard for GitHub repositories, AI agent tasks, and development workflows. The stack is a Node.js/Express API backed by PostgreSQL and Redis, a React/Vite web frontend, and an Android app via Capacitor.

> **Status: experimental prototype.** The core server, authentication, and database layers are implemented and run locally. Several analysis and deployment features are currently mocked (see [What works vs. what's mocked](#what-works-vs-what-is-mocked)). There is no test suite yet. Do not deploy the backend to a shared environment before resolving the security items in [Known limitations](#known-limitations).

## What works vs. what is mocked

Implemented and functional:

- Express API with helmet, CORS, compression, request logging, and rate limiting (100 requests / 15 min per IP on `/api/*`)
- JWT authentication (`register`, `login`, `me`, `refresh`) with bcrypt password hashing (12 rounds)
- PostgreSQL data layer with parameterized queries throughout, and schema creation on first start
- Redis caching (1-hour TTL) for repository metadata lookups
- Repository registration and monitoring records, agent task records, prompt/registry CRUD, prototype generation (scaffolding stored in the database)
- React 19 + Vite frontend with an axios service layer, token interceptors, and Tailwind styling
- Capacitor/Android project scaffold, ready to sync and open in Android Studio
- CI workflow, Dependabot (npm + GitHub Actions), CODEOWNERS, and an org-level governance workflow

Mocked or stubbed (returns placeholder data):

- CLI `analyze` (security / performance / architecture scores) returns randomized values — not real analysis
- CLI `monitor` reports randomized system metrics (process uptime is the only real value)
- CLI `deploy` generates a fabricated `*.example.com` URL and marks the prototype "deployed" — no deployment occurs
- APK upload accepts version metadata only (no multipart file handling) and APK download returns a placeholder URL
- Maintenance-needs detection returns a static canned list
- `backend/demo-server.js` is a separate demo app that accepts any credentials — do not run it; it is not part of the production server

Not wired up (files exist but are not mounted by `server.js`): `routes/quadruple.js`, `routes/zero-gas-rituals.js`, `routes/autonomous-liver.js`, `routes/ip-moat.js`.

There is no WebSocket layer, no OpenAPI document, and no test suite despite what earlier versions of this README claimed. This document supersedes those claims.

## Repository layout

```
ai-guild-hardened-v0.2/
├── backend/               # Node.js/Express API
│   ├── config/            #   PostgreSQL + Redis clients, schema init
│   ├── routes/            #   12 mounted route modules + 4 unmounted
│   ├── server.js          #   Express app (entry: start.js)
│   └── demo-server.js     #   demo stub (not for production)
├── frontend/              # React 19 + Vite + Tailwind web app
│   ├── src/               #   components/ (dashboard, agents, CLI, ...), services/
│   └── android/           #   Capacitor-generated Android project
├── external/flashware/    # separate Sui flash-loan visual builder project
│                          #   (Express/Prisma backend, React flow builder, Move contracts)
├── external/blaze-lib/    # vendored PHP JWT library (not used by the Node code)
├── mini-app-matrix/       # archived static mini-app site versions (v1–v5) + notes
├── ip-protection/         # IP governance artifacts (reports, registry JSON, monitor script)
├── database/migrations/   # SQL migrations
├── docs/                  # iconography generation guide
├── .github/               # CI, org-level governance workflow, Dependabot, CODEOWNERS
├── AI-GUILD-MANIFESTO.md  # project manifesto
├── DEPLOYMENT.md          # APK build and deployment guide
└── PROJECT_SUMMARY.md     # historical build summary (aspirational; not a status report)
```

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (a local instance with credentials you control)
- Redis 6+
- Android Studio + JDK 17 (only for the Android app)

### 1. Backend

```bash
cd backend
npm install        # note: heavy dependencies (puppeteer, sharp); the install is large
cp .env.example .env
# Edit .env: set DB_PASSWORD, JWT_SECRET (a strong random value), and GITHUB_TOKEN
node start.js     # initializes schema, then starts the server on port 3000
```

Environment variables the code actually reads: `PORT`, `NODE_ENV`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `GITHUB_TOKEN`, `JWT_SECRET`. (Other entries in `.env.example` are currently not referenced by the code, e.g. `CORS_ORIGIN` and `JWT_EXPIRES_IN` — token lifetime is hardcoded to 24h.)

**Known first-run bug:** `config/database.js` contains JavaScript-style `//` comments inside the SQL for the `dependencies` and `agent_tasks` table definitions. PostgreSQL rejects `//`, so schema initialization fails on a clean database. Before first run, change those to `--` comments (or apply the fix from the review remediation list).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # dev server on http://localhost:8080
```

The API base URL defaults to `http://localhost:3000` on localhost, otherwise `https://api.nogaslabs.com`. Override with `VITE_API_URL` (e.g. in a `.env` file in `frontend/`). Build with `npm run build` (output in `dist/`).

### 3. Android app

```bash
cd frontend
npm run build
npx cap sync android
npx cap open android   # opens Android Studio; build APK from there
```

## API overview

All API routes are prefixed with `/api`. Authentication uses `Bearer` JWT tokens from `POST /api/auth/login` (register first via `POST /api/auth/register`). Mounted modules: `auth`, `repos`, `architecture`, `maintainer`, `registry`, `prototypes`, `dashboard`, `agents`, `cli`, `apk`, `notifications`, `insights`. A `GET /health` endpoint is available unauthenticated. There is no OpenAPI/Swagger document — treat this section and the route files as the reference.

## Known limitations

These are tracked for remediation and are the reason for the "prototype" status above:

- **Security (must fix before any shared deployment):** the registration endpoint accepts `role` from the request body (allowing self-registered admin accounts); a hardcoded JWT secret fallback exists if `JWT_SECRET` is unset; `backend/.env` is committed to git and there is no root `.gitignore`; CORS is open to all origins.
- **Correctness:** schema init fails due to the `//` SQL comments noted above.
- **Honesty of outputs:** the mocked modules listed above return placeholder data.
- **Testing:** no tests exist; `npm test` in every package exits with an error by design.
- **Dead weight:** `demo-server.js`, `Dashboard.jsx.backup`, the four unmounted route files, and unused heavy dependencies (`puppeteer`, `sharp`, `winston`, `mermaid`, `multer`, `redis` npm package) should be removed or wired up.

## License

The code in this repository is licensed under the **NoGasLabs IP Attribution License v1.0 (NGL-A)** — see [`LICENSE`](LICENSE). Note a known inconsistency: `LICENSE.md` duplicates it with different fee terms, and `package.json` files currently declare MIT/ISC; these should be reconciled to NGL-A or a standard license of the owner's choosing.
