# Server Architecture Guide

## 1. System purpose

The TDTU Conduct Score Management System manages academic identities, role-based access, events, registration, attendance, appeals, notifications, and student conduct scores. The server exposes a REST API on port 3000 and runs a separate asynchronous worker process.

## 2. Technology stack

- Node.js and Express provide the HTTP API.
- TypeScript strict mode provides compile-time safety.
- Prisma accesses PostgreSQL, which is the source of truth.
- Redis stores refresh sessions, rate limits, distributed locks, idempotency keys, short-lived tickets, and caches.
- RabbitMQ transports retryable attendance and audit workloads.
- Server-Sent Events deliver realtime attendance results to clients.
- Prometheus-compatible metrics expose API, queue, worker, and dependency health.

## 3. Request path

A normal request follows `route -> middleware -> controller -> module service -> Prisma/Redis/RabbitMQ`.

Routes attach authentication, permission, validation, and rate-limit middleware. Controllers translate HTTP parameters into typed service inputs and choose status codes. Module services own business rules and transactions. Reusable Prisma operations belong in repositories; optimized SQL and aggregate projections belong in queries.

Every request receives a correlation ID. Expected failures use `ApiError` and return a stable envelope containing an error code, message, optional field errors, and request ID. Unexpected failures are logged without exposing secrets.

## 4. Modules

`src/modules/<domain>` is a vertical business boundary. For example, the attendance module contains scan submission, sessions, bulk import, reconciliation, geofence checks, and attendance-specific queries. This arrangement keeps one business flow together instead of spreading it across a global service folder.

- `services` contain business rules and transaction orchestration.
- `queries` contain typed raw SQL and optimized read projections.
- `repositories` contain reusable Prisma persistence operations when needed.
- schema files contain Zod request contracts.
- `index.ts` exports the supported public API of the module.

Compatibility files under `src/services` currently re-export the new module entry points. They prevent a large breaking change while remaining callers are migrated. New server code should import `@modules/<domain>`.

## 5. Authentication and authorization

The system has four product roles: ADMIN, EVENT_ORGANIZER, STUDENT_AFFAIRS, and STUDENT. The server never accepts a role or permission supplied by the client. Authentication middleware loads current identity and authorization middleware checks permission codes such as `event.update`.

Access tokens expire after 15 minutes and are kept in client memory. Refresh tokens are sent only through an HttpOnly cookie. Redis stores a hash of the refresh token under a server-side session ID. Refresh rotates the session and logout revokes it. Google student accounts must use the TDTU student domain; staff accounts must already be provisioned.

Faculty scope is resolved from current database data. Event organizers and student affairs staff operate within their assigned faculty unless they have an explicit all-unit permission.

## 6. Event registration

Student event lists are paginated and filtered in PostgreSQL. Registration and cancellation use transactions. Capacity-sensitive registration uses serializable isolation, a unique event-student constraint, and retry handling to prevent oversubscription under concurrent requests. Managers may register students according to the explicit management permission and scope rules.

## 7. Attendance and EDA

Opening an attendance session records direction, organizer location, allowed radius, and audit identity. A student QR request is stored with an outbox event in the same PostgreSQL transaction, then the API returns 202. The outbox relay publishes persistent versioned messages through a RabbitMQ confirm channel.

Workers can run as multiple instances. RabbitMQ distributes messages, Redis supports rate limiting and idempotency, and PostgreSQL unique constraints provide final duplicate protection. A worker validates session state, registration rules, QR time slot, GPS accuracy, and Haversine distance before writing an attendance record. It acknowledges a message only after the transaction succeeds. Temporary failures retry; exhausted failures reach the dead-letter queue.

Barcode scanner input, manual student-code entry, and online-event bulk import are separate audited sources. Manual manager entry can bypass registration only where the business rule explicitly allows it.

## 8. Conduct score ledger

Conduct score is a ledger rather than an editable total. Entries record event awards, manual adjustments, reversals, and legacy imports. Criterion totals cap points at each criterion maximum, and the overall projection is constrained to 0-100. Finalization and reopening create status history with actor and reason.

Attendance completion synchronizes event score idempotently. Projections are recalculated transactionally and stored for efficient list and dashboard reads. Students can view their own provisional or finalized score; student affairs staff manage scores only in their faculty scope.

## 9. Appeals, notifications, and warnings

Students submit attendance appeals with object-storage evidence. Approval creates or corrects attendance records and resynchronizes conduct score exactly once. Rejection does not award points.

The warning worker uses a Redis distributed lock so only one instance evaluates a scheduled run. During the final 14 days of an active semester, a student below 80 points receives an active warning and notification. Reaching the threshold or ending the semester resolves the warning. Repeated runs are safe because warning identity is unique per student, semester, and warning type.

## 10. Data and migrations

Prisma schema files are split by domain under `prisma/schema`. Applied migrations are immutable; every database change adds a migration. Seeds are ordered so roles and permissions exist before dependent users. Local commands are `npm run prisma:generate`, `npm run prisma:migrate:local`, and `npm run seed:local`.

PostgreSQL indexes support event time filters, registration pagination, attendance lookup, conduct score lists, outbox polling, and warning scans. Raw SQL is reserved for locking, skip-locked queues, conflict-safe writes, and complex aggregates, with typed result shapes.

## 11. Reliability and scaling

The API is stateless except for external PostgreSQL, Redis, and RabbitMQ dependencies, so multiple API instances can sit behind a load balancer. SSE uses Redis Pub/Sub to fan out events across instances. Scheduled jobs use distributed locks. Queue consumers use prefetch and database idempotency instead of sticky sessions.

Health endpoints report PostgreSQL, Redis, and RabbitMQ state. Metrics track request duration, queue outcomes, retries, dead letters, geofence rejection, SSE connections, and worker inflight load. Structured logs carry request, message, correlation, event, and student identifiers while redacting tokens and exact coordinates.

## 12. Development and verification

For local development, PostgreSQL runs locally while Redis and RabbitMQ must be reachable through configured environment values. Copy `.env.example` to `.env`, fill local placeholders, then install dependencies and run Prisma generation/migration/seed. Start the API and worker using the package scripts documented in the root README.

Use `npm run verify` in `server`. It checks formatting, TypeScript, unit tests, and an isolated production build. Schema changes additionally require Prisma validation, generation, migration, and seed verification. The current unit suite protects conduct score calculation and attendance geofence behavior; transaction and API integration coverage should continue to expand with each domain migration.
