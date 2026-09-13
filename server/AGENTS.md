# Server Instructions

These instructions extend the repository root `AGENTS.md` for all files under `server/`.

## Stack and layout

- Node.js, Express, strict TypeScript, Prisma, PostgreSQL, Redis, and RabbitMQ.
- API entry: `src/index.ts`; worker entry: `src/worker.ts`.
- Prisma schema is split under `prisma/schema/`.
- Seeds are split under `prisma/seeds/` and orchestrated by `prisma/seeds/index.ts`.
- Use `@...` path aliases instead of long relative imports when an alias exists.

## HTTP and validation

- Routes only compose middleware and controllers.
- Controllers parse and validate HTTP input and choose status codes.
- Services own business rules, transactions, persistence, and integration behavior.
- Async route handlers must use `asyncHandler`.
- Expected client errors use `ApiError`; do not leak raw database errors.
- List endpoints must be paginated and return `{ ok, data, pagination }`.
- Search and filters belong in the database query, not in-memory filtering after `findMany`.
- Select only required fields. Never return password or token storage fields.

## Authentication and RBAC

- Access tokens expire after 15 minutes; refresh sessions are stored in Redis.
- Google login accepts verified TDTU identities by intended business rule:
  - `@student.tdtu.edu.vn` -> `STUDENT`.
  - Staff `@tdtu.edu.vn` accounts must be provisioned as `EVENT_ORGANIZER` or `STUDENT_AFFAIRS` before login.
  - Other domains are rejected.
- Keep staff self-registration disabled; only pre-provisioned staff accounts may use Google login.
- A first student Google login creates the user and assigns `STUDENT`; staff roles are assigned beforehand.
- Admin uses the separate credential login and only accesses `/admin` client routes.
- Permissions use lowercase `resource.action`; `*` is the protected administrator wildcard.
- Protect endpoints with the narrowest existing permission, for example `user.read` or `user.delete`.
- New protected behavior requires seed permission descriptions and route middleware assignment.

## Database rules

- Use Prisma transactions for multi-table writes that must succeed or fail together.
- The academic hierarchy is `Faculty -> Major -> Class -> Student`.
- Preserve referential integrity and map Prisma constraint errors to meaningful `ApiError` responses.
- Never rewrite an applied migration. Add a new migration.
- Seed execution order must keep RBAC prerequisites before users that reference roles.
- Seed text intended for the bilingual client must include the appropriate translated data field when
  that field exists in the schema.

## Redis and RabbitMQ

- Redis keys must have a namespace and TTL unless persistence is explicitly required.
- Do not cache password hashes, raw refresh tokens, or unbounded user lists.
- RabbitMQ messages must be versionable, idempotent, and safe to retry.
- Use RabbitMQ for attendance/check-in workloads and other asynchronous operations, not ordinary CRUD.
- Keep queue topology in the RabbitMQ module rather than scattering declarations through services.

## Required checks

```powershell
npm.cmd run typecheck
npm.cmd run build
```

For schema changes also run Prisma generation and explain the migration/seed command to the user.
