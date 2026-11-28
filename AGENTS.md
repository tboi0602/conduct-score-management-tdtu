# AI Working Agreement

This file is the primary instruction source for AI coding agents working in this repository.
Read it before making changes. When working under `client/` or `server/`, also read the nearest
`AGENTS.md`. For product and architecture context, read `Docs/AI_PROJECT_CONTEXT.md`.

## Project identity

- Product: TDTU Conduct Score Management System.
- Purpose: manage student conduct score, events, attendance, evidence, users, and RBAC.
- Primary language for user communication: Vietnamese.
- UI languages: Vietnamese and English.
- Brand colors: TDTU blue `#154a9b` and white.
- Client local port: `3001`.
- Server local port: `3000`.

## Mandatory workflow

1. Inspect existing code and the nearest `AGENTS.md` before editing.
2. Preserve user changes and unrelated work. Never reset or overwrite a dirty worktree.
3. Reuse existing components, hooks, services, query keys, middleware, and utilities.
4. Keep files readable. Do not compress multiple statements or JSX trees onto one line.
5. Do not add a dependency before checking `package.json`.
6. Never hardcode secrets, credentials, tokens, host-specific absolute paths, or `.env` values.
7. Update `.env.example` only with documented placeholders, never real values.
8. After changes, run the smallest relevant verification commands listed below.
9. Report what changed, verification results, and any migration or manual step required.

## Source and naming conventions

- TypeScript strict mode is required. Avoid `any`; use explicit domain types.
- Use English for identifiers, filenames, API fields, permission codes, and database names.
- Never hardcode user-facing UI text (Vietnamese or English) in components, hooks, or client
  services. Every label, placeholder, toast, aria-label, empty state, and fallback error goes
  through a key in `client/src/i18n/`. Branching on locale for text
  (`locale === "vi" ? "..." : "..."`) is forbidden; choosing a date/number locale such as
  `vi-VN` is allowed.
- Permission names use lowercase `resource.action`, for example `user.create` and `event.update`.
- Role codes use uppercase `A-Z0-9_` (for example `EVENT_ORGANIZER`); a role also has an optional
  human `displayName`. Role codes are data, not program constants (see Authorization model).
- Prefer small focused files over controllers, services, hooks, or components with mixed concerns.
- Format changed frontend code with Prettier.

## Architecture boundaries

- HTTP flow: route -> middleware -> controller -> service -> Prisma/Redis/RabbitMQ.
- Controllers validate and translate HTTP input/output; business logic belongs in services.
- Prisma is the source of truth for persistent domain data.
- Redis is for refresh sessions, rate limits, locks, idempotency, and appropriate caches.
- RabbitMQ is for asynchronous, retryable, high-volume work. Normal user/RBAC CRUD stays synchronous.
- Authorization is enforced by the shared `authenticate` and `requirePermission` middleware.
- Never trust a role or permission sent by the client.
- Any schema change requires a Prisma migration and compatible seed updates.

## Authorization model (permission-only)

A role is only a named group of permissions. The system decides what a user may do from the
union of permissions of all their roles, never from which role they hold.

- Forbidden in application code (server and client): comparing or filtering by a role code, for
  example `role.code === "ADMIN"`, `roles.some((r) => r.code === "STUDENT")`,
  `{ role: { code: { in: [...] } } }`, `r."code" IN (...)`, or constant lists such as
  `STAFF_ROLE_NAMES` / `MANAGEMENT_ROLES`.
- Use instead:
  - a permission: `requirePermission("x.y")` on the server, `access.can("x.y")` on the client;
  - `User.isStudent` to tell student accounts from staff accounts;
  - a server-computed flag (for example `isProtected`/`isSystem`) for records the UI must not
    edit or delete.
- `*` is the administrator wildcard. Only an actor holding `*` may assign a role containing `*`.
  An actor may only assign roles whose permissions are a subset of the actor's own permissions.
- The last role holding `*` cannot lose `*` or be deleted, so administration cannot be locked out.
- Seeded system roles are protected on the server (no rename/delete); the client reads that from
  the API instead of keeping its own list.
- APIs that assign roles take `roleIds`, never role codes or names.
- The role stored in a session/JWT is informational only and must never gate access.
- Allowed exceptions: seeds, migrations, and tests may reference role codes; login mode values
  (`"STUDENT" | "ADMIN"`) and screen modes (`"STUDENT" | "STAFF"`) are not roles.

## Error messages

- The server owns error text. API errors return `{ ok: false, error: { code, message } }`.
- The client shows the server `error.message` for 4xx responses (use `useApi` or
  `extractServerErrorMessage(error, t.<fallbackKey>)`). A client-written sentence is only the
  fallback for network errors and 5xx.
- Mapping a known `error.code` to a field-level i18n message is allowed; unknown codes must still
  show the server message, not a generic sentence.

## Pull request checklist

A change is not ready for review until all of these hold for the files it touches:

1. No role-code checks outside seeds, migrations, and tests (Authorization model).
2. No hardcoded user-facing text and no locale ternaries outside `client/src/i18n/`.
3. Shared UI primitives, hooks, services, and query keys are reused (see `client/AGENTS.md`).
4. Error toasts show the server message.
5. `npm.cmd run lint:design -- --changed main` in `client/` reports no errors for changed files.
6. Format, typecheck, and build checks below pass.

Removing an endpoint requires removing every client call and UI control that used it in the same
change.

## Safety and data rules

- Do not delete or rename migrations that may have been applied.
- Do not expose password hashes, refresh tokens, Google tokens, or secrets in API responses or logs.
- Passwords must be hashed with bcrypt. Refresh sessions remain server-side in Redis.
- The default seeded admin is for local development. Do not present it as production-safe.
- Destructive UI actions require a designed confirmation dialog.

## Verification

From `client/`:

```powershell
npm.cmd run format:check
npm.cmd run lint:design -- --changed main
npx.cmd tsc --noEmit
npm.cmd run build
```

From `server/`:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

For Prisma schema or seed changes:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:local
npm.cmd run seed:local
```

Do not claim a check passed unless it was actually executed successfully.

