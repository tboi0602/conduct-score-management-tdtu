# Event and criteria API

Base path: `/api/v1`. All endpoints use bearer authentication and database RBAC,
following the existing User/RBAC route → controller → service design.

| Method | Path | Permission | Result |
| --- | --- | --- | --- |
| GET | `/events` | `event.read` | Paginated events |
| GET | `/events/options/semesters` | `event.read` | Paginated semester options; optional integer `year` |
| GET | `/events/options/criteria` | `event.read` | Paginated criterion options; optional `search` |
| GET | `/events/:id` | `event.read` | Event detail |
| POST | `/events` | `event.create` | Create event, HTTP 201 |
| PUT | `/events/:id` | `event.update` | Replace editable event fields |
| DELETE | `/events/:id` | `event.delete` | Delete event, HTTP 204 |
| GET | `/criteria` | `criteria.read` | Paginated criteria |
| GET | `/criteria/:id` | `criteria.read` | Criterion detail |
| POST | `/criteria` | `criteria.create` | Create criterion, HTTP 201 |
| PUT | `/criteria/:id` | `criteria.update` | Replace editable criterion fields |
| DELETE | `/criteria/:id` | `criteria.delete` | Delete criterion, HTTP 204 |

Single-resource responses use `{ ok: true, data }`. List responses use
`{ ok: true, data: [], pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }`.
Errors follow the existing `{ error: string }` middleware format.
New permissions are seeded for ADMIN; existing lecturer/student grants are preserved.
Additional grants can be assigned through the existing RBAC feature.

## Pagination and search

- `page`: positive integer, default 1.
- `limit`: 1–100, default 20.
- Maximum offset `(page - 1) * limit`: 10,000 for these two lists. Larger offsets
  return HTTP 400 and require narrower filters, preventing arbitrarily deep offset scans.
- `search`: trimmed literal substring of event `name` or criterion `title`,
  case-insensitive, 3–100 characters. Omit it when the search box is empty.
  `%`, `_`, and backslash are treated literally. Search is not accent-insensitive.
- Ordering: `createdAt DESC, id DESC`, including a deterministic tie-breaker.

Event filters combine with AND: `criteriaId`, `semesterId`, `type`
(`UNIVERSITY`, `FACULTY`, `CLASS`, `CLUB`), `checkInMode` (`ONE_WAY`, `TWO_WAY`),
`startsFrom`, `startsTo`. Date bounds are inclusive and filter **timeStart**;
they do not mean event overlap or an event status. Dates require ISO datetimes
with timezone, for example `2026-09-10T00:00:00Z`. URL-encode a `+07:00` offset.

Criterion filters: `minPoints` and `maxPoints`, inclusive bounds on `maxPoints`.
Reversed ranges, malformed UUIDs, arrays/objects in query values and invalid
enums/numbers return HTTP 400.

Example: `GET /api/v1/events?page=1&limit=20&search=seminar&type=FACULTY&checkInMode=TWO_WAY`.

Queries filter in PostgreSQL and select only scalar display fields plus the event's
criterion and semester summaries. Attendance/notification collections are never loaded.
The migration adds B-tree indexes for sorting/filtering and `pg_trgm` GIN indexes
for substring search. Existing time-range and foreign-key indexes are reused.
No Redis list cache or queue is introduced. Exact counts still cost work proportional
to matching data; this is not a large-data latency guarantee. Production sizing
requires representative data and EXPLAIN ANALYZE; short/common searches can be less selective.

## Write bodies

POST/PUT event:

```json
{
  "name": "Faculty seminar",
  "criteriaId": "<existing-criterion-uuid>",
  "semesterId": "<existing-semester-uuid>",
  "timeStart": "2026-09-10T08:00:00+07:00",
  "timeEnd": "2026-09-10T10:00:00+07:00",
  "points": 5,
  "type": "FACULTY",
  "checkInMode": "TWO_WAY"
}
```

POST/PUT criterion:

```json
{ "title": "Participation in activities", "maxPoints": 20 }
```

Names/titles must contain 1–255 characters after trimming. Points are non-negative
32-bit integers. `timeEnd` must follow `timeStart`. Defaults for omitted fields
match Prisma: `points/maxPoints = 0`, `type = UNIVERSITY`, `checkInMode = ONE_WAY`.
PUT is a complete editable representation, not a partial PATCH: omitted defaulted
fields reset to their defaults. IDs/timestamps/relations cannot be mass-assigned.
The existing model does not define a per-event cap equal to criterion `maxPoints`,
so this API does not invent that additional rule or recalculate earned attendance points.
Semesters must already exist; semester CRUD is outside this change.

The existing schema cascades event deletion to attendance records and notifications.
A client must show a designed confirmation that explains this before sending DELETE.
Criterion deletion returns HTTP 409 while events reference it. A transaction locks
the criterion row before checking usage to avoid a check/delete race with event creation.
Missing resources return HTTP 404; invalid foreign-key references on event writes return 409.

## Database and verification

Admin screens are available at `/admin/events` and `/admin/criteria`. The sidebar and
action buttons use real profile permissions. Forms reuse Modal/CustomSelect, deletion
uses ConfirmDialog with cascade/in-use explanations, and all interface labels/error
messages support Vietnamese and English. Search is debounced by 500 ms and omits
search terms shorter than three characters. Reference options load 20 rows at a time,
with search/year filtering and previous/next controls rather than a truncated global list.

The selected existing criterion/semester remains visible when it is outside the current
option page. Required references must be selected before saving. An empty semester
catalog displays a prerequisite message; the UI does not invent academic-year records.
Changing a criterion invalidates event summaries and reference-option caches.

For browser regression testing, run `node tests/serve-admin-ui.cjs` from `server/`,
then `node tests/admin-events.browser.cjs` in another terminal. The helper starts an
isolated client on port 3101 using `client/tmp/admin-ui-next`, so it does not share the
regular dev server's `.next` directory. The test uses the existing local Playwright
installation and Chromium, temporary database fixtures, and real server routes.
It forwards browser API calls to a disposable API listener; it does not modify the
running API's state except its own test rows. Screenshots are saved under
`server/tmp/admin-ui`. `ADMIN_UI_URL` can target another local client instance.

Run from `server/`:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:local
npm.cmd run seed:local
npm.cmd run typecheck
npm.cmd run build
node --test tests/event-criteria.integration.test.cjs
```

The index migration requires PostgreSQL `pg_trgm` support and permission to install
the extension. Schedule index creation appropriately for large live tables.
The separate `20260905025245_reconcile_event_schema` migration was generated from
the pre-existing removal of `lat/lng` in the worktree. It drops those columns and
their data; review it before applying. The CRUD and index migration do not require
applying that column-drop migration to an existing database.

Integration tests create unique disposable rows in the database configured by `.env`,
start an HTTP server on a random loopback port, and clean up their own rows.
Use a local/test database. The tests cover actual authentication/RBAC, CRUD, list
filters/page boundaries, validation, FK constraints, cascade deletion and index presence.
