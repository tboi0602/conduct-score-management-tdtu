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

### STUDENT

- Intended to sign in with a verified `@student.tdtu.edu.vn` Google account.
- Uses the student dashboard route group rather than Admin management pages.
- A first login creates the related student profile and derives the student code from the email prefix.

### EVENT_ORGANIZER and STUDENT_AFFAIRS

- These staff roles use Google sign-in and the administrative shell.
- Their event, attendance, dashboard, and sidebar scope comes from database permissions and the
  effective faculty assigned in the database. They do not receive system-wide access by role name.
- The system has exactly four roles: `ADMIN`, `EVENT_ORGANIZER`, `STUDENT_AFFAIRS`, and `STUDENT`.
- Student Affairs may manage students, event organizers, classes, and conduct scores only in its faculty.

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
- Admin event and criteria management lives at `/admin/events` and `/admin/criteria`.
  These screens reuse shared tables, modals, selects and bilingual labels, and gate actions
  with permissions from `/auth/me`. Event forms use paginated criterion/semester lookups.
- Event dates are entered in the device's local time zone and sent as ISO UTC instants.
  Filtered lists are invalidated after writes because membership/page boundaries can change;
  criterion writes also invalidate event summaries and criterion option queries.

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
- Attendance scan submission uses a PostgreSQL transactional outbox. Confirm-channel producers publish
  versioned RabbitMQ events; horizontally scaled workers use Redis locks plus database uniqueness for
  idempotency, then fan realtime results across API instances through Redis Pub/Sub and SSE.
- Student QR attendance requires GPS with at most 100 metres reported accuracy and validates distance
  against the session centre plus configured event radius. QR tokens rotate every five minutes with a
  30-second previous-slot grace period. Staff barcode/manual attendance does not require staff GPS.
- Dashboard statistics are scoped globally or by effective faculty and cached in Redis for 60 seconds.
  Event registration, attendance, and conduct-score changes invalidate the affected cache version.
- Conduct scores use an append-only entry ledger with criterion projections and a 0-100 summary.
  Finalized scores require an audited reopen action before they can change.
- Student schedules are semester-scoped recurring weekly slots with date-specific `HAS_CLASS` and
  `NO_CLASS` exceptions. The five seeded class sessions are the shared time-slot catalog.
- Events explicitly use `OFFLINE` or `ONLINE` delivery mode. Offline events must start and end on the
  same Vietnam calendar day. Student recommendations include only open, upcoming offline events that
  do not overlap the effective schedule after applying that date's exceptions.

## Important implementation caveats

- Event and criteria CRUD is implemented under `/api/v1/events` and `/api/v1/criteria`,
  following User/RBAC pagination and granular permissions. Lists use database filters,
  bounded offsets and indexed substring search; details are in `Docs/EVENT_CRITERIA_API.md`.
- Event deletion follows the existing cascade to attendance records and notifications.
  Criteria in use cannot be deleted. CRUD does not recalculate earned attendance points.
- Student event registration is stored separately from attendance. Capacity may be unlimited;
  student registration obeys each event's opening/closing window, while authorized managers may
  override the window and capacity. Attendance/absence is derived from check-in records.
- Event capacity uses an atomically maintained `registeredCount`; registration and cancellation
  update the registration row and counter in one PostgreSQL transaction. API instances remain
  stateless behind Nginx `least_conn`, and registration throttling is keyed by user in shared Redis.
- Attendance appeals allow registered students to submit one private S3 evidence image within seven
  days after an event. Each student has three lifetime attempts per event. Scoped managers can approve
  an appeal to repair attendance and conduct score, or reject it with a reason. Resolved appeal rows
  and evidence are retained for three days, then removed by the worker while the compact attempt
  counter remains.
- Student event discovery supports database-backed organizer-level and concrete organizer filters.
  Students may edit their name, phone, address, and date of birth; email, student code,
  class, major, and faculty remain read-only academic data.

- Google login creates student accounts only for `@student.tdtu.edu.vn`. Staff accounts must already
  exist with `EVENT_ORGANIZER` or `STUDENT_AFFAIRS`; unknown staff accounts are rejected.
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
