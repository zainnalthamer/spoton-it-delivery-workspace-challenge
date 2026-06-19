# Prompt Log

Use this file to record meaningful AI-assisted work. You do not need to log tiny autocomplete suggestions. Log prompts that shaped architecture, code, debugging, tests, or product decisions.

## Entry Template

```md
## YYYY-MM-DD HH:mm - Tool Name

### Goal
What were you trying to accomplish?

### Prompt
Paste the exact prompt, or a faithful summary if the prompt included private context.

### Output Summary
What did the AI suggest or generate?

### Files Changed
- path/to/file.ts
- path/to/component.tsx

### Manual Review
What did you verify, change, reject, or test yourself?

### Related Commit
commit-hash-if-available
```

## Entries
## 2026-06-19 14:47 - Claude

### Goal
Figure out a database schema for work items, QA checks, and releases, and get a working connection to Postgres set up in the NestJS backend (no ORM in this project, just raw pg).

### Prompt
Help me design and set up the database layer for the IT Delivery Workspace challenge. The starter backend (NestJS) has no ORM installed, just raw pg, so we need to work with plain SQL.

1. Propose a Postgres schema for work items, QA checks, and releases, including a join table for linking releases to work items, and something to prevent duplicate score points for the same action.
2. Set up a database connection module in NestJS using pg.Pool, and figure out the right way to load it.
3. Make sure the schema actually gets created automatically when the app starts, since there's no migration tool.

### Output Summary
Proposed 6 tables: work_items, qa_checks, releases, release_work_items, work_item_history, score_events. Used CHECK constraints instead of real Postgres enums to keep it simple, and a UNIQUE constraint on (action, entity_type, entity_id) in score_events so duplicate actions can't double-award points. Set up a DatabaseModule/DatabaseService using pg.Pool reading from DATABASE_URL, running schema.sql on every app start (idempotent, safe to rerun). Added dotenv loading in main.ts since nothing was loading .env before. Helped debug two real issues along the way: the project sitting inside a OneDrive-synced folder was causing the compiled dist/main.js to silently disappear, and schema.sql wasn't getting copied into dist because TypeScript only compiles .ts files — fixed by adding it to "assets" in nest-cli.json.

### Files Changed
- backend-nest/src/database/schema.sql
- backend-nest/src/database/database.service.ts
- backend-nest/src/database/database.module.ts
- backend-nest/src/app.module.ts
- backend-nest/src/main.ts
- backend-nest/nest-cli.json
- .env (created locally from .env.example, not committed)

### Manual Review
Ran the schema against the real Postgres container and checked with \dt that all 6 tables actually got created. Confirmed the app starts clean with "Database schema ensured." and no errors. Decided to skip a real users table — there's only one hardcoded login user in the starter, so assignee/tester/createdBy are just plain text fields for now instead of a proper foreign key relationship. Documented that as a tradeoff.

### Related Commit
dec5aa5 (origin/main, main) project initial setup + database schema

## 2026-06-19 14:06 - Claude 

### Goal
Build full CRUD for Work Items in the NestJS backend (DTOs, service, controller) with validation, auth protection, search/filter support, and consistent error handling.

### Prompt
Help me build the backend for Work Items CRUD on top of the database setup from earlier. The starter already has a controller, a JwtAuthGuard, and a RequestUser type. I shared those so the new code matches the existing patterns instead of introducing something different.

1. Set up DTOs for create/update/query with proper validation (required fields, enums for type/priority/status, optional fields like assignee and dueDate).
2. Build the service using the DatabaseService from before: create, list with filters (status, priority, assignee, search, "my work"), get by id, update, delete.
3. Wire up the controller routes behind the existing auth guard, and add a CurrentUser decorator so I'm not manually pulling req.user everywhere.
4. Make sure error handling is consistent: missing/invalid fields should 400 with a clear message, missing records should 404.

I tested everything manually with curl as we went and caught a real bug — PATCHing status wasn't actually changing anything even though it returned 200. Asked for help figuring out why and fixing it.

### Output Summary
Added CreateWorkItemDto, UpdateWorkItemDto (using PartialType), and QueryWorkItemsDto with class-validator decorators. Rewrote ItWorkspaceService with createWorkItem, listWorkItems (status/priority/assignee/search/mine filtering), getWorkItem (throws 404 if missing), updateWorkItem, and deleteWorkItem, all using raw SQL via DatabaseService. Rewrote ItWorkspaceController to expose POST/GET/GET-by-id/PATCH/DELETE routes behind the existing JwtAuthGuard, and added a CurrentUser param decorator. While testing, found that UpdateWorkItemDto never declared a status field, so NestJS's whitelist validation was silently stripping it from incoming requests, and the service's update logic didn't map it to a column either — fixed both.

### Files Changed
- backend-nest/src/it-workspace/dto/create-work-item.dto.ts
- backend-nest/src/it-workspace/dto/update-work-item.dto.ts
- backend-nest/src/it-workspace/dto/query-work-items.dto.ts
- backend-nest/src/it-workspace/it-workspace.service.ts
- backend-nest/src/it-workspace/it-workspace.controller.ts
- backend-nest/src/common/current-user.decorator.ts
- backend-nest/src/common/id.ts
- backend-nest/package.json / package-lock.json (added @nestjs/mapped-types)

### Manual Review
- Tested every endpoint manually with curl: create, list with filters, get-by-id, update, delete. 
- Verified validation errors return 400 with specific per-field messages, and a nonexistent ID returns 404 instead of crashing. 
- Caught and verified the status-update bug specifically. 

### Related Commit
a31be14 added Work Items CRUD with validation, auth, and status update fix

## 2026-06-19 17:44 - Claude 

### Goal
Build the frontend for Work Items: list with filters, create form, detail/edit page, and delete wired up to the backend CRUD API.

### Prompt
Help me build the frontend for Work Items on top of the backend we just finished. I shared the existing blank workspace page, the app layout/sidebar, the existing api.ts lib, an existing page (score) to match style/patterns, and globals.css so nothing gets reinvented. I want three pages: a list with search/filters/My Work toggle, a create form, and a combined detail/edit page with delete. Add an assignee filter dropdown.

### Output Summary
Expanded api.ts with the full WorkItem type, filter/create/update/delete methods, and shared constants for team members, types, priorities, and statuses. Built three pages under /pm/it-workspace: the list page (table view with search, status/priority/assignee filters, My Work toggle, loading/empty/error states), /new (create form), and /[id] (detail page that's also the edit form, plus a delete button with a confirm prompt). Status remains freely editable for now since workflow rules are a later phase. Added the assignee filter dropdown after noticing it was missing from the required filter list.

### Files Changed
- frontend-next/src/lib/api.ts
- frontend-next/src/app/pm/it-workspace/page.tsx
- frontend-next/src/app/pm/it-workspace/new/page.tsx
- frontend-next/src/app/pm/it-workspace/[id]/page.tsx

### Manual Review
Tested the full loop manually in the browser: created a work item, saw it appear in the list, opened it, edited fields including status and assignee, saved, confirmed the list reflected changes, deleted it, confirmed it was removed and redirected back to the list. Verified empty state and loading state render correctly. Verified each filter (status, priority, assignee, search, My Work) narrows the list correctly.

### Related Commit
dac2b3e (HEAD -> work-items, origin/work-items) added Work Items frontend with filters, create, edit, and delete

## 2026-06-19 18:50 - Claude 

### Goal

Implement the work item status workflow on the backend so only valid status transitions are allowed. Support the normal workflow:

backlog → planned → in_progress → qa → ready_for_release → released

while allowing only two backward transitions:

qa → in_progress

ready_for_release → qa

All other transitions should be rejected with a clear error message. Also add status change history tracking and update the frontend so users can only select valid status options.

### Prompt

Reviewed the current it-workspace.service.ts implementation and implemented the workflow rules from the specification. The requirement was to validate all status changes on the backend, record every successful status change in the existing work_item_history table, expose a history endpoint for each work item, and update the frontend status dropdown so it only displays valid next states instead of every possible status.

### Output Summary

- Created a dedicated work-item-transitions.ts file containing the transition rules and helper functions to keep workflow logic separate from the service layer.
- Updated updateWorkItem() to validate every requested status change before updating the database. Invalid transitions now return a 400 Bad Request response with a clear explanation of why the change is not allowed.
- Added automatic history logging whenever a status change succeeds, recording the previous status, new status, user who made the change, and timestamp in the work_item_history table.
- Added a new endpoint: GET /work-items/:id/history to retrieve the complete status history for a work item.
- Updated the controller so the authenticated user's name is passed through and recorded in history entries.
- On the frontend, updated the status dropdown to dynamically show only the current status and any valid next transition options. This improves the user experience while keeping the backend as the final authority for validation.

### Files Changed

- backend-nest/src/it-workspace/work-item-transitions.ts
- backend-nest/src/it-workspace/it-workspace.service.ts
- backend-nest/src/it-workspace/it-workspace.controller.ts
- frontend-next/src/app/pm/it-workspace/[id]/page.tsx

### Manual Review

Verified the workflow using manual API testing with curl.

- Confirmed invalid transitions with a clear validation message.
- Confirmed the full forward workflow path works correctly.
- Confirmed the allowed backward transition succeeds.
- Confirmed invalid backward transitions are rejected.
- Verified that history records correctly store the previous status, new status, user, and timestamp.
- Confirmed in the browser that the status dropdown only displays valid transition options based on the work item's current state.

### Related Commit
f63baf9 (HEAD -> work-items, origin/work-items) enforced work item status transitions and added history logs

## 2026-06-19 19:17 - Claude 

### Goal

Implement QA Checks CRUD linked to work items and enforce the business rule that a work item can only move to ready_for_release when it has at least one QA check and all QA checks have passed. Add a QA management section to the work item details page in the frontend.

### Prompt

- Built QA Checks CRUD functionality nested under work items, including creating checks, listing checks, updating results and statuses, and deleting checks. 
- Added a readiness validation layer on top of the existing workflow transition rules so that moving a work item to ready_for_release is blocked when there are no QA checks or when any QA checks are still pending or failed.
- Manually tested the workflow using curl by attempting the transition with no QA checks, with incomplete QA checks, and after marking all checks as passed.
- After confirming the backend logic, implemented the frontend QA section within the work item details page. The goal was to provide a simple way to manage QA checks directly from the UI, including adding new checks, updating statuses, viewing progress, and removing checks.

### Output Summary

- Added dedicated DTOs for creating and updating QA checks.
- Extended the workspace service with full QA check CRUD operations and introduced an isQaReady() helper responsible for validating whether a work item satisfies the release requirements.
- Integrated QA readiness validation into updateWorkItem() so any attempt to move a work item to ready_for_release is checked before the update occurs. The API returns specific messages depending on the situation, such as when no QA checks exist or when only some checks have passed.
- Added new controller routes for managing QA checks under individual work items and for updating or deleting specific checks.
- On the frontend, added QA check types and API methods, then created a dedicated QA section on the work item details page. The section includes an add-check form, editable status dropdowns for each check, a live passed/total progress indicator, and delete actions.

### Files Changed

- backend-nest/src/it-workspace/dto/create-qa-check.dto.ts
- backend-nest/src/it-workspace/dto/update-qa-check.dto.ts
- backend-nest/src/it-workspace/it-workspace.service.ts
- backend-nest/src/it-workspace/it-workspace.controller.ts
- frontend-next/src/lib/api.ts
- frontend-next/src/app/pm/it-workspace/[id]/page.tsx

### Manual Review

- Tested the release readiness workflow against a real work item using curl.
- Confirmed that moving to ready_for_release is blocked when no QA checks exist.
- Confirmed that having a pending QA check still prevents the transition.
- Confirmed that once all QA checks are marked as passed, the transition succeeds.
- Verified that creating, updating, and deleting QA checks works correctly through the frontend.
- Verified that the passed/total progress badge updates immediately when check statuses change.
- Confirmed that backend validation messages are displayed correctly in the UI when release requirements have not been met.

### Related Commit
27e313e (HEAD -> qa-checks, origin/qa-checks) dded QA checks with realese-readiness gate

## 2026-06-19 08:25 - Claude 

### Goal

Implement Releases CRUD along with release linking and deployment workflows. Enforce the following business rules:

- Only work items in ready_for_release can be linked to a release.
- Deploying a release automatically updates all linked work items to released'.
- A release can only be deployed once.

### Prompt

- Built the backend support for Release Notes on top of the existing work item and QA functionality. The requirement included full CRUD operations for releases, endpoints to link and unlink work items, and a deployment endpoint.
- The deployment workflow needed to enforce several business rules: work items must already be ready_for_release before they can be linked, deployed releases must reject any further modifications, deploying a release should automatically move all linked work items to released, and attempting to deploy the same release twice should return an error rather than succeeding silently.

### Output Summary

- Added DTOs for creating and updating releases.
- Extended the workspace service with release management functionality, including creating, listing, retrieving, updating, and managing linked work items.
- Implemented release detail retrieval with linked work items loaded through a join query, allowing release information and associated work items to be returned together.
- Added link and unlink operations with validation rules to ensure only work items in the ready_for_release state can be linked and that deployed releases can no longer be modified.
- Implemented a dedicated deployment workflow. Before deployment, the service validates that the release has not already been deployed and contains at least one linked work item. Once deployed, the release status is updated and all linked work items are automatically moved to released. A history entry is also recorded for each work item affected by the deployment.
- Added matching controller routes for release management, linking and unlinking work items, and deploying releases.

### Files Changed

- backend-nest/src/it-workspace/dto/create-release.dto.ts
- backend-nest/src/it-workspace/dto/update-release.dto.ts
- backend-nest/src/it-workspace/it-workspace.service.ts
- backend-nest/src/it-workspace/it-workspace.controller.ts

### Manual Review

Tested the complete release workflow using curl.

- Created a release successfully.
- Confirmed that linking a work item that was still in backlog was rejected with a clear validation message.
- Successfully linked a work item that was in ready_for_release.
- Verified that the release details endpoint returned the linked work item information.
- Deployed the release and confirmed that both the release status and all linked work item statuses updated correctly.
- Confirmed that attempting to deploy the same release again returns an error.
- Confirmed that linking additional work items to an already deployed release is rejected.

### Related Commit
3862f6e (HEAD -> release-notes, origin/release-notes) added releases CRUD with rules

## 2026-06-19 08:57 - Claude 

### Goal

Build the Releases frontend, including a releases list page, release creation form, and release details page with linking, unlinking, and deployment functionality. Also fix a bug where creating a release with an existing version number caused an unhandled server error instead of returning a user-friendly validation message.

### Prompt

Implemented the Releases frontend following the same patterns already established for Work Items. The requirement was to provide:

- A releases list page
- A release creation page
- A release details page
- Linking and unlinking work items
- Release deployment functionality
- Navigation access from the main PM area

While testing the feature, creating a release sometimes resulted in a generic Internal Server Error. I investigated the issue and identified the cause in the backend.

### Output Summary

Added release-related types and API methods to the frontend API layer.

Built the following pages:

- /pm/releases
  - Displays all releases with status badges
  - Provides navigation to release details

- /pm/releases/new
  - Release creation form
  - Supports entering release information and creating new releases

- /pm/releases/[id]
  - Release status banner
  - Deploy button
  - What Shipped section showing linked work items
  - Ability to unlink work items
  - Dropdown for linking eligible work items currently in ready_for_release status

Added a Releases navigation link to the PM layout so the feature is accessible throughout the application.

While debugging the release creation error, discovered that the database was rejecting duplicate release versions due to an existing UNIQUE constraint. Since the exception was not being handled, PostgreSQL surfaced a raw database error that resulted in a generic 500 response.

Updated the backend release creation logic to:

- Detect PostgreSQL unique constraint violations
- Catch error code 23505
- Return a proper BadRequestException with a clear validation message
- Prevent duplicate release versions from causing server errors

### Files Changed

- frontend-next/src/lib/api.ts
- frontend-next/src/app/pm/layout.tsx
- frontend-next/src/app/pm/releases/page.tsx
- frontend-next/src/app/pm/releases/new/page.tsx
- frontend-next/src/app/pm/releases/[id]/page.tsx
- backend-nest/src/it-workspace/it-workspace.service.ts

### Manual Review

Verified the complete release workflow in the browser:

- Created a release successfully
- Linked a work item that was ready for release
- Confirmed the linked item appeared in the What Shipped section
- Deployed the release successfully
- Confirmed the release status changed to deployed
- Confirmed linked work items automatically moved to released status
- Verified the QA section still displayed the correct passed count after deployment
- Confirmed duplicate release versions now return a clear validation message instead of a generic Internal Server Error

### Related Commit
6076919 (HEAD -> release-notes, origin/release-notes) Added releases frontend and fixed unhandled duplicate-version error

## 2026-06-19 09:36 - Claude 

### Goal

Replace the in-memory scoring system with a database-backed implementation using the existing score_events table and idempotency rules from Phase 1. Automatically award points for key workflow actions and add comprehensive unit tests covering workflow transitions, QA validation, release rules, and score idempotency.

### Prompt

Updated the scoring system so it persists score events in PostgreSQL rather than memory. The requirement was to use the existing score_events table and unique constraint to guarantee idempotency while keeping the manual score-award endpoint working for compatibility.

Integrated automatic score awards into the core workflow:

- Creating a work item
- Moving a work item to QA
- Completing a QA check
- Moving a work item to Ready for Release
- Deploying a release

After validating the scoring behavior manually, added unit tests covering workflow transitions, QA readiness rules, release restrictions, deployment behavior, and score idempotency. Tests needed to run entirely against mocked services without requiring a real database connection.

### Output Summary

Reworked the ScoreService to use PostgreSQL-backed score events instead of in-memory storage.

Added a new awardForEntity method that records score events using the existing unique constraint on action, entity type, and entity ID. The implementation uses ON CONFLICT DO NOTHING to ensure duplicate actions never create duplicate score events.

Kept the original manual scoring endpoint unchanged to maintain backwards compatibility.

Integrated automatic scoring into the workflow service:

- Awarded points when a work item is created
- Awarded points when a work item moves to QA
- Awarded points when a QA check is completed
- Awarded points when a work item becomes Ready for Release
- Awarded points when a release is deployed

Added unit tests for workflow transitions covering:

- All valid forward transitions
- All invalid transitions
- Allowed backward transitions
- Explicit invalid transition examples from the specification

Added service-level tests covering:

- QA readiness validation when no QA checks exist
- QA readiness validation when only some checks have passed
- QA readiness validation when all checks have passed
- Release linking restrictions for non-ready work items
- Release linking restrictions for already deployed releases
- Release deployment validation
- Deployment idempotency
- QA check scoring idempotency
- Prevention of duplicate score awards on no-op updates

All tests use a mocked DatabaseService, allowing the full suite to run without any database dependency.

### Files Changed

- backend-nest/src/score/score.service.ts
- backend-nest/src/it-workspace/it-workspace.service.ts
- backend-nest/src/it-workspace/it-workspace.controller.ts
- backend-nest/src/it-workspace/work-item-transitions.spec.ts
- backend-nest/src/it-workspace/it-workspace.service.spec.ts

### Manual Review

- Verified scoring behavior end-to-end using both curl and the browser.
- Confirmed creating a work item awards 1 point
- Confirmed moving a work item to QA awards 1 point
- Confirmed repeating the same status update does not award additional points
- Confirmed completing a QA check awards 1 point
- Confirmed moving a work item to Ready for Release awards 2 points
- Confirmed deploying a release awards 3 points
- Confirmed attempting to deploy an already deployed release returns a validation error
- Confirmed duplicate deployment attempts do not create additional score events
- Ran the complete unit test suite successfully
- Verified all 26 tests passed

### Related Commit
ed65d4e (HEAD -> backend-tests, origin/backend-tests) wired score idempotency into workflow actions and added unit tests

## 2026-06-19 10:12 - Claude 

### Goal

Build the Engineering Timeline creative feature, providing a single chronological view of everything that has happened to a work item, including workflow status changes and QA activity. Reuse the existing work item history data and introduce proper QA history tracking so timeline events remain accurate over time.

### Prompt

Selected Engineering Timeline as the creative feature because the application was already recording work item history but had no way to visualize it.

The requirement was to create a unified timeline that combines workflow events and QA activity into a single chronological feed. During testing, discovered an issue where QA status changes were not being tracked historically. Only the current QA status was stored, meaning if a QA check was marked as passed and later changed back to pending, there was no record that it had ever passed.

Instead of working around the limitation, implemented a proper historical tracking solution using a dedicated QA history table following the same pattern already used for work item status history.

### Output Summary

Added a new qa_check_history table to store all QA status changes over time.

Updated QA check update logic so every QA status change is recorded, including transitions between pending, passed, and any future statuses.

Implemented a new timeline service method that combines multiple event sources into a single timeline:

- Work item status changes
- QA check creation events
- QA check status change events

Merged all events into one collection and sorted them chronologically by timestamp.

Added human-readable event descriptions so timeline entries are easy to understand without needing knowledge of database structures.

Created a dedicated API endpoint for retrieving a work item's complete timeline.

Built a timeline section on the work item details page displaying:

- Workflow status changes
- QA activity
- User responsible for each action
- Formatted timestamps
- Visual event indicators

Added color-coded event markers to make different event types easier to identify:

- Navy for work item status changes
- Orange for QA-related events

### Files Changed

- backend-nest/src/database/schema.sql
- backend-nest/src/it-workspace/it-workspace.service.ts
- backend-nest/src/it-workspace/it-workspace.controller.ts
- frontend-next/src/lib/api.ts
- frontend-next/src/app/pm/it-workspace/[id]/page.tsx

### Manual Review

Tested the timeline API using curl against a work item with a complete workflow history.

- Verified status progression events appeared correctly from backlog through released
- Verified QA check creation events appeared in the timeline
- Initially identified that QA passed events were missing from historical records
- Traced the issue to QA status changes not being stored historically
- Implemented qa_check_history tracking and re-tested
- Confirmed pending-to-passed transitions now appear correctly with the appropriate user and timestamp
- Verified timeline events are returned in chronological order
- Verified the frontend renders timeline entries correctly
- Confirmed event colors, actor information, and timestamps display as expected on a fresh work item with newly generated history

### Related Commit
64a3f97 (HEAD -> creative-feature, origin/creative-feature) feat: added engineering timeline feature