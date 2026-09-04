# Barcode Attendance System - Folder Structure Documentation

## Root Directory

| File | Description |
|---|---|
| `.env.example` | Template variables for full stack (Postgres, Redis, RabbitMQ, Nginx, Geofence, Rule Engine, JWT). Copy to `.env` to run locally. **Never commit `.env`**. |
| `.env` | Runtime configuration — loaded by `dotenv` at startup. All services read from this file. |
| `file_tree_folder.md` | This document — describes every directory and its purpose. |
| `README.md` | High-level project overview (existing). |
| `Docs/` | Supplementary design documents: DA_BC.docx, DB.html, EDA.html, LoadBalance.html, Overview.docx (existing). |
| `docker-compose.yml` | Orchestrates 6 services: Postgres, Redis, RabbitMQ, Nginx, Client (Next.js), API Producer + Worker Consumer. Uses `network: attendance-net` (bridge). |
| `Makefile` *(not yet)* | Would contain `up`, `down`, `restart`, `logs`, `test` targets (future). |

## `docker-compose.yml` — Services

| Service | Image | Exposed Ports | Depends On | Purpose |
|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432:5432` | — | Primary datastore. Volume `postgres_data`, init.sql run once on first start. Healthcheck `pg_isready`. |
| `redis` | `redis:7-alpine` | `6379:6379` | — | Idempotency locks (SETNX), sliding-window rate-limit, in-memory cache. AOF persistence, `maxmemory 256mb`, LRU eviction. Healthcheck `redis-cli ping`. |
| `rabbitmq` | `rabbitmq:3.13-management-alpine` | `5672:5672`, `15672:15672` | — | Event backbone: direct exchange `attendance.events`, durable queue `attendance.scan.queue`, DLQ `attendance.scan.queue.dlQ`. Management UI at `:15672`. Volume `rabbitmq_data`, definitions.json baked at boot. |
| `client` | Built from `client/Dockerfile` | — | — | Next.js 14 App Router in `standalone` mode. Proxied by Nginx. Env: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_URL`. |
| `nginx` | Built from `docker/nginx/Dockerfile` | `80:80` | `api` (service_healthy), `client` (service_started) | Reverse proxy, rate-limit zones (`global_ip: 10 req/s burst 20`, `scan_attempt: 5 req/s`), upstream least_conn load-balance to `api`/`api-2`, proxy headers (`X-Real-IP`, `X-Forwarded-For`), health check `/`. |
| `api` | Built from `server/Dockerfile` target `api` | — | `postgres`, `redis`, `rabbitmq` | Express API Producer. Publishes `attendance.scanned` events to RabbitMQ. Enforces per-student rate-limit via Redis. Healthcheck `/health`. `env_file: .env`. |
| `api-2` | Same image as `api` | — | `postgres`, `redis`, `rabbitmq` | Second API instance for horizontal scaling. No `container_name` (Docker Compose generates unique name). Deploy via `replicas: ${WORKER_REPLICAS:-2}`. |
| `worker` | Built from `server/Dockerfile` target `worker` | — | `postgres`, `redis`, `rabbitmq` | Worker Consumer. Consumes `attendance.scan.queue`, processes geofence, persists `AttendanceLog`, emits `attendance.result` events. `deploy replicas: ${WORKER_REPLICAS:-2}`. No `container_name`. |

## `client/`

Next.js 14 App Router + Tailwind CSS. Architecture: server components (root layout) + client components (UI, interactive parts).

| File/Directory | Purpose |
|---|---|
| `client/Dockerfile` | Multi-stage: `deps` → `builder` → `runner`. Stage `runner` copies `.next/standalone` + static assets. USER `nextjs` (uid 1001). Exposes `PORT 3000`. CMD `node server.js`. |
| `client/next.config.js` | `output: "standalone"`, `reactStrictMode: true`, `poweredByHeader: false`. Enables standalone output (all needed files in `.next/standalone`). |
| `client/package.json` | Prod: `next`, `react`, `react-dom`. Dev: `tailwindcss`, `autoprefixer`, `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `postcss`. Scripts: `dev`, `build`, `start`, `lint`. |
| `client/postcss.config.js` | Tailwind + Autoprefixer plugin registration. |
| `client/tailwind.config.js` | Brand palette (`#2563EB`), success/warning/danger colors, font family (system UI + Roboto), border-radius, box-shadow, scanner animation keyframes (`scan-line`), darkMode `class`. |
| `client/tsconfig.json` | `target: ES2022`, `module: esnext`, `jsx: preserve`, `paths: { "@/*": ["./src/*"] }`, `isolatedModules: true`. |
| `client/src/app/` | Root layout (`layout.tsx`) wraps `Providers` (i18n context). Home page (`page.tsx`) landing screen. `globals.css` @tailwind base/components/utilities. |
| `client/src/components/ui/` | `Button.tsx` variant/size props. `Header.tsx` with locale toggle (VI/EN). `Footer.tsx` copyright. |
| `client/src/components/layout/` | Header (language switch), Footer (copyright). |
| `client/src/hooks/` | `useLocale` — reads/sets locale from context + cookie. `useMediaQuery` — boolean for CSS media queries. |
| `client/services/` | `api.ts` — fetch wrapper: `BASE_URL` from env, `apiGet/Post/Put/Del` helpers. All API calls go through Nginx proxy (`/api/v1/*`). |
| `client/types/` | Shared TypeScript interfaces: `Student`, `Event`, `AttendanceLog`, `Warning`, `ApiResponse`, `ScanPayload`. Used by both client logic and server-generated types. |
| `client/i18n/` | Multi-language (Vietnamese + English). `provider.tsx` creates `LocaleContext` with `t(key)` translation function. `config.ts` (ready) for next-intl integration. `locales/vi.json` + `locales/en.json` contain full string set (see below). `index.ts` barrel export. |
| `client/lib/` | Utility functions: `cn()` (clsx class merging), `formatDate()` (DD/MM/YYYY), `formatDateTime()`, `formatScore()`. |
| `client/providers/` | `index.tsx` — `<Providers>` wrapper around app children (currently only `LocaleProvider`). Easy to extend with `AuthContext` later. |
| `client/middleware.ts` | Next.js middleware: reads cookie `locale`, redirects to default `vi` if unsupported, sets cookie max-age 1 year. `config.matcher` applies to all routes except `/_next`, `/api`, `favicon.ico`. |

## `server/`

Node.js (TypeScript + Express) split into API Producer + Worker Consumer. Deployed via Docker multi-stage.

| File/Directory | Purpose |
|---|---|
| `server/Dockerfile` | 3-stage build: `deps` (npm ci) → `builder` (tsc + `prisma generate`) → `base` (shared node_modules + dist). Two runtime targets: `api` (`node dist/index.js`) and `worker` (`node dist/worker.js`). Exposes `PORT 3000`. |
| `server/package.json` | Prod: `express`, `amqplib`, `ioredis`, `prisma`, `@prisma/client`, `cors`, `helmet`. Dev: `tsx`, `@types/*`, `typescript`. Scripts: `dev`, `dev:worker`, `build`, `start`, `start:worker`, `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `seed`, `lint`, `typecheck`. |
| `server/tsconfig.json` | `target: ES2022`, `module: CommonJS`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `resolveJsonModule: true`, `outDir: ./dist`, `rootDir: ./src`, `forceConsistentCasingInFileNames: true`. |
| `server/prisma/schema.prisma` | Core models: `Student`, `Event`, `EventEnrollment`, `AttendanceLog`, `Warning`. Enums: `Gender`, `StudentStatus`, `EventStatus`, `AttendanceStatus`, `WarningSeverity`. Indexes on `className`, `faculty`, `startAt`/`endAt`, `status`, `scannedAt`. Scaled for ~1k students + high-frequency scan ingestion. |
| `server/src/config/` | Infrastructure boilerplate (kept as-is): `rabbitmq.ts` (amqplib connection + auto-reconnect + publisher confirms + topology assert: direct exchange + DLX + durable queue). `redis.ts` (ioredis + SETNX idempotency lock, sliding-window rate-limit, distributed Lua lock, cache GET/SET/DEL). `logger.ts` (JSON structured logger). `auth.ts` (JWT sign/verify — kept for future auth middleware). |
| `server/src/index.ts` | Minimal Express bootstrap: `dotenv` → connect redis + rabbitmq → create `express` app → `/health` endpoint (used by Docker compose healthcheck). |
| `server/src/worker.ts` | Minimal worker bootstrap: `dotenv` → connect redis + rabbitmq → console log `"[worker] ready"`. Sits ready for future consumer registration. |
| `server/src/routes/` | (Scaffold empty — will contain route handlers: `/api/v1/auth`, `/api/v1/attendance/scan`, `/api/v1/events`, `/api/v1/students`). |
| `server/src/middleware/` | (Scaffold empty — will contain: `requireAuth` JWT middleware, `requireRole` role checker, rate-limit middleware wrapping Redis sliding-window). |
| `server/src/services/` | (Scaffold empty — will contain: `student.service.ts`, `event.service.ts`, `attendance.service.ts`, `warning.service.ts` — Prisma helpers). |
| `server/src/workers/` | (Scaffold empty — will contain: `attendance.consumer.ts` — consume `attendance.scan.queue`, dedup Redis, geofence check, upsert `AttendanceLog`, emit rule-engine warnings). |

## `docker/`

Infrastructure configs for Postgres, Redis, RabbitMQ, Nginx.

| File/Directory | Purpose |
|---|---|
| `docker/nginx/nginx.conf` | Nginx reverse proxy: upstream `attendance_api` (2 instances `api:3000` + `api-2:3000` least_conn), upstream `client:3000`. Two rate-limit zones: `global_ip` (10 req/s burst 20), `scan_attempt` (5 req/s). `location = /api/v1/attendance/scan` stricter zone. Proxy headers: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`. Short timeouts for scan (2s connect, 5s send, 10s read). Static assets cached 30d. Health check `/`. |
| `docker/nginx/Dockerfile` | `nginx:1.25-alpine` CMD `nginx -g "daemon off;"`. |
| `docker/postgres/init.sql` | SQL bootstrap: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, `ALTER SYSTEM SET max_connections = 150`, `work_mem = '32MB'`, `synchronous_commit = off`, `max_wal_size = '2GB'`, `checkpointer_timeout = '300s'`, role `_health` for Docker healthcheck. |
| `docker/postgres` | Contains `Dockerfile` (build context) and `init.sql` (run once on container start). |
| `docker/rabbitmq/definitions.json` | Exchange `attendance.events` (direct, durable), DLX `attendance.dlx` (direct, durable). Queue `attendance.scan.queue` (durable, dead-letter → DLX, max-length 100k, TTL 24h per message). Queue `attendance.scan.queue.dlq` (durable, bind-key `#`). Baked into RabbitMQ at boot via definitions file — no plugin needed. |
| `docker/redis/Dockerfile` | `redis:7-alpine` + custom config mounted as volume. AOF persistence (`appendonly yes`, `everysec`), `maxmemory 256mb`, `maxmemory-policy allkeys-lru`, `maxclients 10000`. |
| `docker/redis/redis.conf` | Actual Redis config: port 6379, tcp-backlog 511, timeout 0, appendfsync everysec, auto-aof-rewrite, maxmemory LRU eviction. |

## `docker/redis` & `docker/redis.conf`

Redis tuned for high-frequency idempotency + rate-limit workloads:

- AOF (append-only file) for durability of SETNX locks across restarts.
- `maxmemory 256mb` + `allkeys-lru` to prevent OOM under load.
- `maxclients 10000` to handle many concurrent scan connections.
- Config mounted as volume so `redis.conf` can be adjusted without rebuild.

## `docker/postgres` & `docker/postgres/init.sql`

Postgres optimized for write-heavy barcode scan workload:

- `uuid-ossp` extension for UUID generation.
- `work_mem = 32MB`, `max_wal_size = 2GB` for ingestion throughput.
- `synchronous_commit = off` (recoverability via replication, not single-node).
- `max_connections = 150` with connection pooling in app code.
- Role `_health` used by Docker compose healthcheck (`pg_isready -U _health`).

## Multi-language (Vietnamese / English)

- i18n context wraps entire Next.js app via `client/src/providers/index.tsx`.
- Two locale JSON files: `client/src/i18n/locales/vi.json` and `client/src/i18n/locales/en.json`.
- Each contains ~80+ keys covering: scan/button, score/display, nav, auth, warnings, common actions, status labels.
- `client/src/hooks/useLocale` reads cookie `locale` and provides `setLocale` + `t(key)`.
- `client/src/middleware.ts` reads cookie on every request, sets default `vi` if missing.
- All UI text (buttons, alerts, table headers, error messages) should go through `t(key)` so both languages switch instantly.

## Scale ~1,000 Students — Design Notes

- **Postgres**: Single instance sufficient for 1k students + scan TPS ~200-500. Connection pool + `work_mem` tuning. If scale grows → consider read replica or partitioning by class/faculty.
- **Redis**: SETNX lock per (student + event + idempotency key). Rate-limit sliding window via sorted sets (ZREMRANGEBYSCORE + ZADD + ZCARD). TTL auto-clean. 256mb maxmemory enough for lock set + rate-limit buckets.
- **RabbitMQ**: Direct exchange + durable queue + DLQ guarantees no event loss. Publisher confirms + prefetch 20. Burst rate-limit enforced by Nginx zone `scan_attempt` (5 req/s). 2 DLQ messages per failed scan → admin can reprocess.
- **Nginx**: Rate-limit `10 req/s` global + `5 req/s` scan-specific. Upstream `least_conn` auto-balances 2 API instances. Health check `/` every 10s. Static asset cache 30d reduces origin load.
- **WebSocket / Socket.IO**: Not yet implemented but infrastructure ready (Nginx `proxy_set_header Upgrade` + `Connection: upgrade`). Future: worker publishes `attendance.result` → API consumes → Socket.IO emits to `student:{id}` room.
- **i18n**: Adding a new language = add JSON file + keys + `useLocale` hook. No code change needed beyond adding strings.
- **Observability**: Healthchecks (`/health` on API, `redis-cli ping`, `pg_isready`, `rabbitmq-diagnostics ping`). Logs JSON structured via `logger.ts`. Metrics (request count, scan rate) could be added via Prometheus later.

## File Tree (generated from repository)

```
.
├── .env.example
├── .env
├── file_tree_folder.md
├── docker-compose.yml
├── Docs/
│   ├── DA_BC.docx
│   ├── DB.html
│   ├── EDA.html
│   ├── LoadBalance.html
│   └── Overview.docx
├── README.md
├── client/
│   ├── Dockerfile
│   ├── next.config.js
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── ui/
│       │   │   └── Button.tsx
│       │   └── layout/
│       │       ├── Header.tsx
│       │       └── Footer.tsx
│       ├── hooks/
│       │   ├── useLocale.ts
│       │   └── useMediaQuery.ts
│       ├── services/
│       │   └── api.ts
│       ├── types/
│       │   └── index.ts
│       ├── i18n/
│       │   ├── config.ts
│       │   ├── provider.tsx
│       │   ├── locales/
│       │   │   ├── vi.json
│       │   │   └── en.json
│       │   └── index.ts
│       ├── lib/
│       │   └── utils.ts
│       └── providers/
│           └── index.tsx
├── server/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.ts
│       ├── worker.ts
│       ├── config/
│       │   ├── rabbitmq.ts
│       │   ├── redis.ts
│       │   ├── auth.ts
│       │   └── logger.ts
│       ├── routes/
│       ├── middleware/
│       ├── services/
│       ├── workers/
│       ├── models/
│       └── producers/
├── docker/
│   ├── nginx/
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   ├── postgres/
│   │   └── init.sql
│   ├── rabbitmq/
│   │   └── definitions.json
│   └── redis/
│       ├── Dockerfile
│       └── redis.conf
└── package.json (root, optional)