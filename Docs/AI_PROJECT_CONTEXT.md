# AI Project Context

This document records stable product and architecture decisions. Update it whenever a new decision
changes the system's intended behavior. Do not treat aspirational README features as already complete;
inspect the implementation before claiming a feature exists.

## Product scope

The system manages TDTU student training/conduct points. The planned domain includes:

- institutional structure: faculties, majors, classes, lecturers, and students;
- events and student participation;
- high-volume attendance/check-in processing;
- conduct-point rules, evidence, review, warnings, and progress;
- authentication, users, roles, and granular permissions;
- real-time updates and operational monitoring.

The current implementation is incremental. Authentication, RBAC, user administration, academic seed
data, Redis refresh sessions, RabbitMQ infrastructure, and the Admin client are the most developed areas.

## Current actors

### ADMIN

- Uses the separate `/admin` credential login.
- Uses pages under `/admin` only.
- Manages users, roles, and permissions.
- The seeded wildcard permission `*` represents full access.

### LECTURER

- Intended to sign in with a verified `@tdtu.edu.vn` Google account.
- Shares the administrative shell for lecturer-authorized functions.
- Must never receive Admin-only behavior merely because the UI route is under `/admin`.

### STUDENT

- Intended to sign in with a verified `@student.tdtu.edu.vn` Google account.
- Uses the student dashboard route group rather than Admin management pages.
- A first login creates the related student profile and derives the student code from the email prefix.

## RBAC decisions

- Roles and permissions are database data, seeded before accounts that reference them.
- Permissions are granular: `user.read`, `user.create`, `user.update`, and `user.delete` are separate.
- Adding a permission should normally require only seed/data creation and attaching
  `requirePermission("resource.action")` to the appropriate route.
- The API is the enforcement boundary. Hiding a button in the client is not authorization.
- Role detail screens show actual permissions and their descriptions, not only a count.

## Client decisions

- Admin layout uses a collapsible sidebar with centered icons and custom tooltips.
- Role and Permission navigation is grouped under Authorization/Phân quyền.
- Administrator identity and logout live at the bottom of the sidebar.
- User management displays roles plus faculty, major, class, student code, and timestamps.
- User search covers name, email, and student code; the client debounce is 500 ms.
- Create/edit flows use modals. Destructive actions use custom confirmation dialogs.
- Locale is stored under localStorage key `locale` and must survive reloads.
- TanStack Query is the server-state cache. Do not duplicate API state into unrelated local state.
- Boneyard skeletons are preferred for page/data loading; action-level progress may stay compact.

## Server and infrastructure decisions

- Local API: `http://localhost:3000`.
- Local client: `http://localhost:3001`.
- PostgreSQL may run locally or in Docker.
- Redis and RabbitMQ normally run in Docker while developing the Node server locally.
- Docker-published PostgreSQL, Redis, and RabbitMQ ports bind to `127.0.0.1`.
- Nginx fronts multiple API producers in the container topology.
- Redis stores refresh-session hashes, rate-limit state, locks, idempotency data, and selected caches.
- RabbitMQ decouples high-volume attendance work from API request latency.
- SSE is the existing realtime transport in `server/src/realtime/sse.ts`; do not describe it as Socket.IO.

## Important implementation caveats

- `server/src/services/auth.service.ts` currently contains a commented domain check and a temporary
  development fallback in `roleForEmail`. The intended production rule is still TDTU-only. Any change
  here must be explicit and tested rather than inferred.
- The seeded `admin` / `admin` account is only a local-development bootstrap convenience.
- Do not cache a complete, frequently changing user list in Redis by default. The Admin client already
  uses TanStack Query for short-lived view caching.
- Normal user/RBAC CRUD should remain synchronous; a worker adds complexity without benefit there.

## Environment files

- `server/.env`: local server runtime values.
- `server/.env.example`: documentation-only server placeholders.
- `client/.env.local`: local public client configuration.
- `client/.env.example`: documentation-only client placeholders.
- `.env.docker`: Docker Compose runtime values and secrets; do not commit real credentials.

## Keeping this memory current

When completing a feature that changes a stable rule, update this document in the same change. Examples:

- a new actor or role;
- a new route ownership rule;
- a new cache or queue responsibility;
- a change to login domains or token lifetime;
- a replacement for SSE, Redis session structure, or the academic hierarchy.

