# Business modules

`src/modules` groups server code by business capability instead of by technical layer alone.
Each directory is a boundary that owns the use cases and database queries for one domain.

## Directory roles

- `services/`: business rules, transactions, authorization scope checks, and integration orchestration.
- `queries/`: typed raw SQL or read projections that Prisma cannot express efficiently.
- `repositories/`: reusable Prisma persistence operations when a domain needs them.
- `*.schemas.ts`: Zod request contracts owned by the domain.
- `index.ts`: the public API of a module. Controllers and workers should import this barrel instead of internal files.

Routes remain responsible for composing middleware. Controllers remain thin HTTP adapters. PostgreSQL through Prisma is the persistent source of truth; Redis and RabbitMQ are integrations invoked by module services.

## Current modules

- `appeals`: attendance appeal lifecycle and evidence access.
- `attendance`: sessions, scan submission, bulk import, reconciliation, geofence, and request queries.
- `conduct-score`: calculation, adjustments, projections, finalization, and event score synchronization.
- `criteria`: conduct score criterion catalog.
- `dashboard`: scoped dashboard aggregation and caching.
- `events`: student event discovery and registration commands.
- `infrastructure`: transactional outbox relay.
- `notifications`: notification request schemas.
- `warnings`: end-of-semester conduct score warning jobs.

Files under `src/services` that only re-export a module are temporary compatibility facades. New code should import `@modules/<domain>`.
