# Technical Decisions

## Summary

Implemented the full IT Delivery Workspace across all 5 levels of the challenge, plus one creative feature.

- **Level 1 (Core Work Items):** Full CRUD for work items with authentication, search, filters, and a "My Work" view.
- **Level 2 (Workflow & Ownership):** A backend-enforced status state machine with valid forward transitions and two allowed backward moves, plus a full audit history of status changes.
- **Level 3 (QA Checks):** CRUD for QA checks linked to work items, with a backend rule blocking release-readiness until at least one check exists and all checks have passed.
- **Level 4 (Release Notes):** CRUD for releases, with rules restricting linking to ready work items only, and a deployment action that cascades linked items to `released`.
- **Level 5 (Score, Idempotency, Tests, Polish):** Database-backed scoring tied to 5 real workflow actions, with idempotency enforced via a unique constraint so repeated actions (e.g. double-deploying) never double-award points. 26 unit tests cover the state machine, QA gate, release rules, and score idempotency.
- **Creative Feature:** An Engineering Timeline showing every status change and QA event for a work item, merged into one chronological view.

## Database Design

Raw SQL via `pg` (no ORM was installed in the starter, so none was introduced). Schema lives in `backend-nest/src/database/schema.sql` and is applied idempotently (`CREATE TABLE IF NOT EXISTS`) on every API startup, so there's no separate migration step required to run the project.

**Tables:**
- `work_items` — core entity. `status`, `type`, `priority` are constrained with `CHECK` rather than Postgres enums, to keep the schema simple and avoid enum-migration overhead.
- `qa_checks` — linked to `work_items` via `work_item_id` with `ON DELETE CASCADE`.
- `releases` — `version` has a `UNIQUE` constraint, which doubles as a safeguard against accidentally creating duplicate releases.
- `release_work_items` — join table linking releases to work items, composite primary key `(release_id, work_item_id)`.
- `work_item_history` — append-only log of every work item status change (`from_status`, `to_status`, `changed_by`, `changed_at`). Powers both the audit trail and the Engineering Timeline feature.
- `qa_check_history` — same pattern as above, but for QA check status changes. Added during the creative feature build after discovering the timeline couldn't show "QA passed" events for checks whose status had since changed again, since only current QA status was being stored.
- `score_events` — records every awarded score event. Has a `UNIQUE (action, entity_type, entity_id)` constraint, which is the actual mechanism behind score idempotency (see Workflow Rules below).

**IDs:** all primary keys are `TEXT`, generated as `<prefix>_<uuid>` (e.g. `wi_...`, `qa_...`, `rel_...`) via a small `generateId()` helper using Node's built-in `crypto.randomUUID()`. This matches the existing seeded user's ID style (`usr_intern_001`) and keeps IDs human-scannable in the database.

**No `users` table:** the starter only has a single hardcoded login user with no registration system. Building a real multi-user table was out of scope for what the spec asks (it asks to keep auth as-is). Instead, `assignee`, `tester`, and `createdBy`/`changedBy` are plain `TEXT` columns, populated from either the logged-in user's name or a small hardcoded list of team member names used in frontend dropdowns, to make ownership/assignment data look realistic in the demo.

## API Design

All workspace endpoints live under `/it-workspace`, protected by the existing `JwtAuthGuard`.

- `POST/GET /work-items`, `GET/PATCH/DELETE /work-items/:id` — standard CRUD, with `GET /work-items` supporting `?status=`, `?priority=`, `?assignee=`, `?search=`, and `?mine=true` query filters.
- `GET /work-items/:id/history` and `GET /work-items/:id/timeline` — the former is the raw status-change log; the latter merges status history, QA-added events, and QA status-change history into one sorted feed for the creative feature.
- `POST/GET /work-items/:id/qa-checks`, `PATCH/DELETE /qa-checks/:id` — QA checks are nested under their parent work item for creation/listing, but addressed directly by their own ID for updates/deletes, since a QA check's identity doesn't depend on its parent once it exists.
- `POST/GET /releases`, `GET/PATCH /releases/:id` — release CRUD.
- `POST/DELETE /releases/:id/link/:workItemId` — linking/unlinking modeled as a sub-resource action rather than a generic PATCH, since linking has its own validation rules (see below) distinct from editing release metadata.
- `POST /releases/:id/deploy` — deployment is a distinct action endpoint rather than a status PATCH, because it has side effects beyond updating one field (cascading status changes to multiple work items, plus a score award), which didn't fit the generic update pattern used elsewhere.

Validation is handled via DTOs with `class-validator` decorators (matching the pattern already used in the starter's `AwardScoreDto`), so invalid input is rejected before it reaches business logic, with field-specific error messages returned as a 400.

## Frontend Design

Built on top of the existing Next.js App Router shell, sidebar layout, and `globals.css` design tokens (navy/orange palette, `.card`/`.button`/`.badge`/`.table` utility classes) — no new styling system was introduced, to keep the new pages visually consistent with the starter's score page.

- `/pm/it-workspace` — work item list: table view, search box, status/priority/assignee filters, a "My Work" toggle, loading/empty/error states.
- `/pm/it-workspace/new` — create form.
- `/pm/it-workspace/[id]` — combined detail/edit page. Also hosts the QA Checks section (list, inline status toggles, add-check form, pass/fail progress badge) and the Engineering Timeline, since all three are tightly related to one work item and splitting them into separate pages would add navigation overhead without benefit.
- `/pm/releases`, `/pm/releases/new`, `/pm/releases/[id]` — mirrors the work items page structure. The release detail page shows deployment status, a "What Shipped" table of linked items, a dropdown to link any currently-ready work item, and a Deploy button that's disabled once deployed.

The work item status dropdown on the detail page is dynamically restricted to only the current status plus its valid next states (computed from the same transition map as the backend), so the UI guides users toward valid actions while the backend remains the actual source of truth.

## Workflow Rules

**Valid work item status transitions:** enforced in `work-item-transitions.ts`, a small pure function (`isValidTransition`) backed by an explicit allow-list map, called from `ItWorkspaceService.updateWorkItem` before any database write happens. Forward path is `backlog → planned → in_progress → qa → ready_for_release → released`; the only allowed backward moves are `qa → in_progress` and `ready_for_release → qa`. Every other transition throws a `BadRequestException` with a specific message. Covered by unit tests for every valid/invalid case named in the spec.

**QA readiness rule:** when a transition's target status is `ready_for_release`, `updateWorkItem` additionally queries all QA checks for that item and requires at least one check to exist and all checks to have `status = 'passed'`. Zero checks and partially-passed checks both produce distinct, specific error messages. This check runs only after the base transition is confirmed valid, so an already-invalid transition fails for the right reason rather than a QA-related one.

**Release deployment rule:** `linkWorkItem` rejects linking unless the target work item's status is exactly `ready_for_release`, and also rejects linking to a release that's already `deployed`. `deployRelease` rejects releases with zero linked items, and rejects releases that are already `deployed`. On a successful deploy, every linked work item is updated to `released` and gets a corresponding `work_item_history` entry, all within the same request.

**Score idempotency:** the actual mechanism is a database constraint, not application-level locking — `score_events` has `UNIQUE (action, entity_type, entity_id)`, and awards are inserted with `ON CONFLICT (action, entity_type, entity_id) DO NOTHING`. This means even if the same award were somehow attempted twice (a retried request, a race condition, a UI bug bypassing a disabled button), the database itself guarantees only one row — and one payout — can ever exist for that exact action+entity pair. Verified manually (deploying a release twice, the second attempt rejected with no new score event) and with unit tests asserting `awardForEntity` is never even called on a rejected duplicate deploy.

## Tradeoffs

- **No real multi-user system.** Only one user can log in (matching the starter), with team member names as plain text rather than real user records. Documented above under Database Design.
- **CHECK constraints instead of Postgres enums** for `status`/`type`/`priority`/`deployment_status`, to avoid enum-alteration migration complexity for a 2-day project.
- **No frontend optimistic updates** — every action (status change, link, deploy) re-fetches from the server after the request resolves, rather than updating local state immediately. Simpler and safer for a short timeline, at the cost of a small delay before the UI reflects a change.
- **No pagination** on work item or release lists — acceptable for the data volumes involved in a demo/assessment context, but would need addressing for a real production dataset.
- **No rate limiting or request-level idempotency keys** beyond the database unique constraint — sufficient for the spec's stated duplicate-prevention requirement, but a production system might also want idempotency keys at the API layer for network-retry scenarios.

## Unfinished Work

With more time, the next priorities would be:
- Integration tests against a real test database (current tests are unit tests with a mocked `DatabaseService`, which cover business logic but not the actual SQL).
- A proper multi-user system with real assignment/ownership instead of free-text team member names.
- Pagination and sorting controls on the work items and releases lists.
- A "rolled_back" release flow — the schema supports the `rolled_back` deployment status, but no UI or business logic currently uses it.
- Expanding the Engineering Timeline to also include release-linking and deployment events, not just status/QA changes.