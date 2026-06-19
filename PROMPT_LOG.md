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
