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
- User-facing text must come from the i18n layer when the screen supports language switching.
- Permission names use lowercase `resource.action`, for example `user.create` and `event.update`.
- Roles use uppercase names such as `ADMIN`, `LECTURER`, and `STUDENT`.
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

