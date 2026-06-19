# AI Usage

Use this file to explain how you used AI tools during the challenge.

## Tools Used

| Tool | Used? | Notes |
| --- | --- | --- |
| ChatGPT | Yes | Used alongside Claude for debugging — troubleshooting errors and unexpected behavior encountered while building. |
| Claude | Yes | Primary tool, used throughout via Claude.ai chat — architecture, code generation, debugging, and review for the entire project. |
| Codex | No | |
| Cursor | No | |
| Other | No | |

## Summary

AI was used as a pairing partner for the entire project. Claude was the primary tool — used for planning the approach, writing most of the backend and frontend code, and walking through debugging step by step. ChatGPT was also used fairly regularly alongside Claude for debugging specific errors and unexpected behavior. I made the final calls on product/scope decisions (e.g. how to handle the single-user auth limitation, which creative feature to build, when to add tests vs. move on), ran every command myself, and tested every feature manually via curl and the browser before accepting it as working. Several real bugs were caught specifically because I tested results instead of assuming AI-generated code was correct on first pass.

## Main Areas AI Helped With

- **Architecture:** Database schema design (6 tables, relationships, constraints), API endpoint structure, and the overall phase-by-phase build plan.
- **Backend:** DTOs, services, controllers for Work Items, QA Checks, and Releases; the status state machine; the QA readiness gate; release linking/deployment rules; score idempotency using a unique database constraint.
- **Frontend:** All Next.js pages (list/create/detail views for Work Items and Releases), the API client, and the Engineering Timeline UI.
- **Database:** Schema design, idempotent schema application on startup (no migration tool was installed in the starter, so a custom startup-time approach was used instead).
- **Tests:** Unit tests for the transition state machine and the service's business rules (QA gate, release rules, score idempotency), using a mocked database so no live connection is required to run them.
- **Debugging:** A project-breaking build issue caused by the repo sitting inside a OneDrive-synced folder, a missing-asset build config issue, and several real application bugs (see below). ChatGPT was also used for general debugging help alongside Claude.
- **Documentation:** Drafting AI_USAGE.md, DECISIONS.md, and PROMPT_LOG.md entries based on the actual work done.

## What You Reviewed Manually

- Ran every single backend endpoint manually via curl after it was written, including deliberately testing invalid inputs (bad enums, missing fields, nonexistent IDs, invalid state transitions) to confirm error handling actually worked, not just the happy path.
- Verified the QA readiness gate by manually walking a work item through zero QA checks, then a pending check, then a passed check, confirming the release-readiness transition was blocked or allowed correctly at each stage.
- Verified the release linking and deployment cascade end to end, including deliberately trying to link a non-ready item and deploy an already-deployed release to confirm both were rejected.
- Verified score idempotency by checking the score total before and after a deploy, then attempting the same deploy again and confirming the total did not change.
- Reviewed every git diff before committing and kept `.env` out of version control.
- Ran the full test suite (`npm test`) and read the actual output rather than assuming it passed.

## What AI Got Wrong

- **Silently dropped field on update:** an early version of the work item update DTO didn't declare a `status` field, so NestJS's whitelist validation silently stripped `status` out of PATCH requests. The API returned a 200 with no error, but the status never actually changed. This was only caught because I tested the response body carefully instead of just checking the status code.
- **Unhandled database error surfaced as a raw 500:** creating a release with a duplicate version (a `UNIQUE` constraint violation) crashed with a generic "Internal server error" instead of a clean message, because the create-release code path wasn't wrapped in a try/catch for that specific case. Caught while testing the frontend, not predicted in advance.
- **Incomplete data model for a feature, caught during the creative feature build:** the Engineering Timeline initially tried to infer "QA check passed" events from the QA check's `created_at`/`updated_at` timestamps instead of an actual history log, which meant a QA check that was marked passed and later reverted to pending would show no historical record of ever having passed. This required adding a proper `qa_check_history` table mid-feature rather than relying on the original (incorrect) assumption that current state was enough.
- **Suggested file path that didn't match the project's actual conventions:** early in setup, AI suggested creating a new `.env.example` inside `backend-nest/`, without first checking that one already existed at the project root using a different variable naming convention (`DATABASE_URL` vs. separate host/port/user vars). This was caught before any code was written, by asking why the file was being duplicated rather than assuming it was correct.

## Commands Run

```bash
npm run install:all
docker compose up -d postgres
npm run dev:api
npm run dev:web
npm run build
npm test
```

## Known Limitations

- Only one user can log in (matches the starter's auth setup); assignee/tester fields are free text rather than tied to real user accounts.
- Tests are unit tests against a mocked database, not full integration tests against a live Postgres instance.
- No pagination on work item or release lists.
- The `rolled_back` deployment status exists in the schema but has no UI or logic wired to it yet.
- The Engineering Timeline currently covers status changes and QA activity, but not release linking/deployment events.

## Prompt Log

See `PROMPT_LOG.md`.