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
(add after committing)