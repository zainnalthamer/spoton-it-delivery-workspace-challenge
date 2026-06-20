# AI Usage

This document explains how AI tools were used throughout the challenge.

## Tools Used

| Tool | Used? | Notes |
|-------|--------|-------|
| ChatGPT | Yes | Used mainly for debugging, troubleshooting errors, and getting a second opinion when something wasn't working as expected. |
| Claude | Yes | The primary AI tool used throughout the project for planning, implementation, debugging, and code review. |
| Codex | No | |
| Cursor | No | |
| Other | No | |

## Summary

AI was used throughout the project as a development assistant and sounding board. Claude was the main tool I relied on for planning the system architecture, generating code, reviewing implementations, and helping work through bugs. ChatGPT was also used regularly when debugging issues or validating solutions from a different perspective.

Although AI helped generate a large portion of the code, all decisions about scope, implementation details, and tradeoffs were made by me. I ran every command myself, manually tested every feature, reviewed all generated code before keeping it, and made adjustments whenever something didn't fit the requirements. Several bugs and design issues were only discovered because I tested the application thoroughly instead of assuming the generated code was correct.

## Main Areas AI Helped With

### Architecture

- Designing the database schema, including tables, relationships, and constraints
- Planning the API structure
- Breaking the project into manageable implementation phases

### Backend

- Generating DTOs, services, and controllers
- Implementing Work Item, QA Check, and Release functionality
- Building the status transition logic
- Implementing QA readiness validation
- Creating release linking and deployment rules
- Implementing score idempotency through database constraints

### Frontend

- Building the Next.js pages
- Creating list, create, and detail views
- Implementing the API client
- Developing the Engineering Timeline feature

### Database

- Designing the schema
- Creating startup-time schema initialization since the starter project did not include a migration system

### Testing

- Writing unit tests for business rules and status transitions
- Creating mocked database tests so the test suite could run without a live database connection

### Debugging

- Troubleshooting build issues caused by storing the project inside a OneDrive-synced directory
- Fixing configuration problems related to missing assets
- Investigating and resolving application bugs found during testing
- Using both Claude and ChatGPT to compare approaches when debugging difficult issues

### Documentation

- Assisting with drafts of AI_USAGE.md, DECISIONS.md, and PROMPT_LOG.md
- Helping organize technical explanations and project notes

## What I Reviewed Manually

- Tested every backend endpoint manually using curl after implementation
- Tested invalid inputs, missing fields, invalid enum values, nonexistent IDs, and invalid state transitions to verify error handling
- Verified the QA readiness workflow by moving work items through different QA states and confirming transitions were correctly blocked or allowed
- Tested release linking and deployment scenarios, including invalid cases that should be rejected
- Verified score idempotency by checking scores before and after deployment attempts and confirming duplicate deployments did not affect totals
- Reviewed all git changes before committing
- Ensured `.env` files were never committed to version control
- Ran the full test suite and reviewed the results rather than assuming everything passed

## What AI Got Wrong

### Status Updates Were Being Silently Ignored

An early version of the Work Item update DTO did not include the `status` field. Because NestJS validation was configured to whitelist properties, the field was silently removed from PATCH requests. The API returned a successful response, but the status never actually changed.

This issue was only discovered because I carefully checked the returned data instead of only looking at the HTTP status code.

### Duplicate Release Versions Returned a Generic Error

Creating a release with a duplicate version triggered a database `UNIQUE` constraint violation. The error was not handled properly, resulting in a generic internal server error rather than a meaningful validation message.

This problem was discovered during frontend testing.

### Timeline History Was Missing Important Events

The first implementation of the Engineering Timeline attempted to infer historical QA events using the current QA check timestamps. This approach failed when a QA check changed state multiple times because previous transitions were lost.

After discovering the limitation, I introduced a dedicated `qa_check_history` table to preserve the complete event history.

### Incorrect Environment File Recommendation

Early in development, AI suggested creating a new `.env.example` file inside the backend folder without recognizing that one already existed at the project root.

The existing configuration also used a different variable format, so blindly following the suggestion would have created unnecessary duplication. This was caught before implementation.

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

- Authentication supports only a single user because that matches the starter project's setup
- Assignee and tester fields are free-text values rather than references to user accounts
- Tests focus on business logic and use a mocked database instead of a live PostgreSQL instance
- Work Item and Release lists do not currently support pagination
- The `rolled_back` deployment status exists in the schema but is not yet connected to any application logic or UI
- The Engineering Timeline currently tracks status changes and QA activity but does not yet include release linking or deployment events

## Prompt Log

See `PROMPT_LOG.md`.