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
- Students sign in with student code + password (`loginStudent`); staff and administrators sign in
  with email + password (`loginAdmin`). Accounts are provisioned by staff; there is no
  self-registration.
- `User.isStudent` is the only way to distinguish a student account from a staff account. Never
  infer it from a role, an email domain, or the presence of a role named `STUDENT`.
- Access to the management workspace is decided by permissions (`hasManagementAccess`), not roles.
- Refresh validates the session and that the user is `ACTIVE`; it must not validate a role code.
- Permissions use lowercase `resource.action`; `*` is the protected administrator wildcard.
- Protect endpoints with the narrowest existing permission, for example `user.read` or `user.delete`.
- New protected behavior requires seed permission descriptions and route middleware assignment.

### Permission-only RBAC (strict)

Follows the root `AGENTS.md` Authorization model. On the server specifically:

- Services must not contain `role.code ===`, `role: { code: ... }` filters, raw SQL on
  `roles.code`, or role-code constant lists. Business scope comes from permissions (for example
  `event.manage-any-unit`, `faculty-staff.*`), faculty scope (`getEventAccess`), and `isStudent`.
- If a service needs "is this actor an administrator", check for the `*` permission, not `ADMIN`.
- If a rule needs to protect a record (default admin, system role), store or compute a flag
  (`isSystem`, `isProtected`) and return it to the client.
- Role create/update/delete validates: code matches `^[A-Z][A-Z0-9_]*$`; system roles cannot be
  renamed or deleted; the last role with `*` keeps `*`; permission ids exist.
- Role assignment enforces: target permissions ⊆ actor permissions; `*` only by a `*` holder;
  actor cannot change their own roles; faculty scope is respected.
- Endpoints take `roleIds` (UUIDs). Do not accept role codes or `roleName` from the client.
- Role codes may appear only in `prisma/seeds/`, migrations, and tests.

### Error responses

- Throw `ApiError(status, message, code?)` with an English `message` that is safe to show to the
  user and a stable machine `code` (for example `STAFF_EMAIL_INVALID`) when the client must react
  to it. The client displays `message` for 4xx, so write it as a complete, specific sentence.

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
