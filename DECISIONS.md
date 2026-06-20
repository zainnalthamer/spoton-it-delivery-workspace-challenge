# Technical Decisions

## Summary

Implemented the full IT Delivery Workspace across all 5 levels of the challenge, along with one creative feature.

- **Level 1 (Core Work Items):** Full CRUD for work items with authentication, search, filters, and a "My Work" view.
- **Level 2 (Workflow & Ownership):** A backend-enforced status workflow with valid forward transitions, two allowed backward moves, and a full audit history of status changes.
- **Level 3 (QA Checks):** CRUD for QA checks linked to work items, with a backend rule that blocks release-readiness until at least one check exists and all checks have passed.
- **Level 4 (Release Notes):** CRUD for releases, with rules that only allow ready work items to be linked, plus a deployment action that moves linked items to `released`.
- **Level 5 (Score, Idempotency, Tests, Polish):** Database-backed scoring tied to 5 real workflow actions, with idempotency enforced through a unique constraint so repeated actions never double-award points. 26 unit tests cover the state machine, QA gate, release rules, and score idempotency.
- **Creative Feature:** An Engineering Timeline that shows every status change and QA event for a work item in one chronological view.

## Database Design

The project uses raw SQL through `pg`. No ORM was included in the starter, so I kept the stack simple and did not introduce one. The schema is stored in `backend-nest/src/database/schema.sql` and is applied on every API startup using `CREATE TABLE IF NOT EXISTS`, so there is no separate migration step needed to run the project.

**Tables:**

- `work_items`: the main entity for the workspace. `status`, `type`, and `priority` use `CHECK` constraints instead of Postgres enums to keep the schema simple and avoid enum migration issues.
- `qa_checks`: linked to `work_items` through `work_item_id` with `ON DELETE CASCADE`, so QA checks are removed automatically if their work item is deleted.
- `releases`: stores release notes. The `version` field has a `UNIQUE` constraint to prevent duplicate release versions.
- `release_work_items`: join table that links releases to work items, using a composite primary key of `(release_id, work_item_id)`.
- `work_item_history`: append-only log of every work item status change, including `from_status`, `to_status`, `changed_by`, and `changed_at`. This powers both the audit trail and the Engineering Timeline.
- `qa_check_history`: same idea as `work_item_history`, but for QA check status changes. This was added during the creative feature build after I realized the timeline could not reliably show past QA events if only the current QA status was stored.
- `score_events`: records awarded score events. It has a `UNIQUE (action, entity_type, entity_id)` constraint, which is what enforces score idempotency.

**IDs:** all primary keys are `TEXT`, generated as `<prefix>_<uuid>` such as `wi_...`, `qa_...`, and `rel_...`. This is handled by a small `generateId()` helper using Node's built-in `crypto.randomUUID()`. I kept this style because it matches the seeded user ID format, such as `usr_intern_001`, and makes records easier to recognize when checking the database.

**No `users` table:** the starter project only includes a single hardcoded login user and no registration system. Since the spec asked to keep authentication as-is, I did not add a full multi-user system. Instead, `assignee`, `tester`, `createdBy`, and `changedBy` are plain `TEXT` columns. They are populated either from the logged-in user's name or from a small hardcoded list of team member names used in the frontend dropdowns, which makes ownership and assignment data feel realistic in the demo.

## API Design

All workspace endpoints live under `/it-workspace` and are protected by the existing `JwtAuthGuard`.

- `POST/GET /work-items`, `GET/PATCH/DELETE /work-items/:id`: standard work item CRUD. `GET /work-items` supports `?status=`, `?priority=`, `?assignee=`, `?search=`, and `?mine=true`.
- `GET /work-items/:id/history` and `GET /work-items/:id/timeline`: the history endpoint returns the raw status-change log, while the timeline endpoint combines status history, QA-created events, and QA status-change history into one sorted feed.
- `POST/GET /work-items/:id/qa-checks`, `PATCH/DELETE /qa-checks/:id`: QA checks are created and listed under their parent work item, but updated and deleted directly by QA check ID.
- `POST/GET /releases`, `GET/PATCH /releases/:id`: release CRUD.
- `POST/DELETE /releases/:id/link/:workItemId`: linking and unlinking are handled as their own actions because they have validation rules separate from normal release editing.
- `POST /releases/:id/deploy`: deployment is its own endpoint because it has side effects beyond changing one field. It updates the release, moves linked work items to `released`, writes history entries, and awards score.

Validation is handled through DTOs using `class-validator`, following the pattern already used in the starter's `AwardScoreDto`. Invalid input is rejected before reaching the business logic and returns field-specific 400 responses.

## Frontend Design

The frontend builds on the existing Next.js App Router structure, sidebar layout, and `globals.css` design tokens. I reused the starter's navy and orange palette, along with existing utility classes like `.card`, `.button`, `.badge`, and `.table`, so the new workspace pages feel consistent with the original score page.

- `/pm/it-workspace`: work item list with a table view, search box, status filter, priority filter, assignee filter, "My Work" toggle, and loading, empty, and error states.
- `/pm/it-workspace/new`: create work item form.
- `/pm/it-workspace/[id]`: combined detail and edit page. It also includes the QA Checks section and Engineering Timeline because they are all closely related to the selected work item.
- `/pm/releases`, `/pm/releases/new`, `/pm/releases/[id]`: release pages following the same structure as the work item pages.
- The release detail page shows deployment status, linked work items, available release-ready work items, and a Deploy button that is disabled after deployment.

The work item status dropdown is dynamically restricted to the current status and its valid next states. This helps guide the user toward valid actions, while the backend still remains the real source of truth.

## Workflow Rules

**Valid work item status transitions:** status transitions are enforced in `work-item-transitions.ts` through a small pure function called `isValidTransition`. It uses an explicit allow-list map and is called inside `ItWorkspaceService.updateWorkItem` before any database update happens.

The forward path is:

`backlog → planned → in_progress → qa → ready_for_release → released`

The only allowed backward moves are:

`qa → in_progress`

`ready_for_release → qa`

Every other transition throws a `BadRequestException` with a clear message. The transition rules are covered by unit tests for the valid and invalid cases required by the spec.

**QA readiness rule:** when a work item is moved to `ready_for_release`, the service checks its QA checks first. At least one QA check must exist, and every QA check must have `status = 'passed'`.

Zero QA checks and partially passed QA checks return different error messages. This validation only runs after the base status transition is confirmed as valid, so invalid transitions fail for the correct reason instead of showing a QA-related error.

**Release deployment rule:** `linkWorkItem` only allows work items with status `ready_for_release` to be linked to a release. It also prevents linking new items to a release that has already been deployed.

`deployRelease` rejects releases with no linked work items and also rejects releases that are already deployed. On a successful deployment, all linked work items are updated to `released`, and matching `work_item_history` entries are created in the same request.

**Score idempotency:** score idempotency is handled at the database level. The `score_events` table has a `UNIQUE (action, entity_type, entity_id)` constraint, and score awards are inserted using `ON CONFLICT (action, entity_type, entity_id) DO NOTHING`.

This means that even if the same score event is attempted twice because of a retry, race condition, or UI bug, the database guarantees that only one score event can be stored for that exact action and entity. I verified this manually by attempting duplicate deploy actions and also covered it with unit tests.

## Tradeoffs

- **No real multi-user system.** The starter only supports one login user, so team members are stored as plain text instead of real user records.
- **CHECK constraints instead of Postgres enums.** This keeps the schema easier to change during a short project and avoids enum migration overhead.
- **No frontend optimistic updates.** After actions like status changes, linking, or deployment, the UI re-fetches data from the server instead of updating local state immediately. This is simpler and safer for the project timeline.
- **No pagination.** Work item and release lists do not currently have pagination. This is acceptable for a demo-sized dataset, but it would need to be added for a larger production system.
- **No rate limiting or request-level idempotency keys.** The database unique constraint is enough for the duplicate-prevention requirement in the spec, but a production system could add request-level idempotency keys as well.

## Unfinished Work

With more time, the next priorities would be:

- Integration tests against a real test database. The current tests use a mocked `DatabaseService`, which is good for business logic but does not test the real SQL.
- A proper multi-user system with real assignment and ownership instead of free-text names.
- Pagination and sorting controls for the work item and release lists.
- Expanding the Engineering Timeline to include release linking and deployment events, not just status changes and QA activity.