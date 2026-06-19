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
project initial setup + database schema

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
added Work Items CRUD with validation, auth, and status update fix