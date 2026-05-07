# Testing Rules

Tests are not optional. Untested code is not done.

---

## Test Pyramid

```
         /\
        /E2E\         ← Few, slow, critical user flows only
       /------\
      /  Integ  \     ← Database, API, service integration
     /------------\
    /     Unit      \ ← Business logic, domain rules, utilities
   /------------------\
```

- **Unit**: Fast, isolated, no I/O. For business logic, domain rules, pure functions.
- **Integration**: Real database, real service calls. For repositories, API endpoints.
- **Component**: Frontend components rendered in isolation — assert on output, interaction, and structure (snapshots).
- **E2E**: Real browser or API client against running app. For critical flows only.

---

## What Must Be Tested

### Always (P0)
- Happy path for every user-facing feature
- Auth failure (401) for every protected endpoint
- Authorization failure (403) for every permission-gated action
- Tenant isolation — a user cannot access another tenant's data
- Invalid input rejection — 400 for each required field

### Usually (P1)
- State machine transitions — invalid transitions rejected
- Boundary conditions — min/max values, empty collections
- Concurrent write safety — idempotency or optimistic lock
- Soft delete — deleted entities not returned in lists
- Pagination — page boundaries, total counts

### When Relevant (P2)
- Background job execution and retry behaviour
- Email delivery triggers on state changes
- File upload validation (type, size, content)
- Rate limit enforcement

---

## Frontend Component Tests

For React (or any component framework) projects, every UI component that renders data must have:

- **Render assertion** — component renders without crashing in each data state (loading, error, empty, populated).
- **Interaction test** — primary user actions (click, submit, navigate) trigger the expected callback or state change.
- **Snapshot test** — captured for components whose visual output is part of the contract (cards, list rows, badges, modals). Snapshots catch unintended structural changes during refactors. Tooling: `vitest`/`jest` `toMatchSnapshot`, or `@testing-library/react`.
- **Visual regression test** — for design-system components (Button, Input, Modal, etc.) and any component that has approved Figma reference. Tooling: Chromatic, Playwright + Percy, or `@storybook/test-runner`. Run on every PR that touches `apps/web` or `packages/ui`.

Snapshots are not a substitute for behavioural tests — they verify "did the structure change?", not "did the feature work?". Use both.

A frontend PR without snapshot or visual-regression coverage on a data-rendering component is a **WARN** finding in `frontend-reviewer` — must be acknowledged in the PR description before merge.

---

## Test Quality Rules

### Structure
- **Arrange / Act / Assert** — one assertion group per test.
- Test names describe the scenario: `"returns 403 when user lacks submit permission"` — not `"test1"` or `"works"`.
- One concept per test — don't test two different behaviours in one test.
- Tests are independent — no shared mutable state between tests.
- Tests are deterministic — same code always produces same result (no `Date.now()`, no `Math.random()` without seeding).

### Data
- Use factories or fixtures for test data — no copy-pasted JSON blobs.
- Reset database state between test suites (transactions or truncate).
- Never test against production or shared staging databases.
- Use realistic data shapes — not `"test"` for every string field.

### Mocking
- **Mock external services**, not internal code.
- Mock email providers, payment gateways, third-party APIs.
- Do NOT mock the database for integration tests — use a real test database.
- Do NOT mock domain services — test them with real behaviour.

---

## Coverage Expectations

| Layer | Target Coverage |
|---|---|
| Domain / business logic | 90%+ |
| Services | 80%+ |
| API routes (integration) | 70%+ |
| Frontend components | 60%+ |
| Utilities | 90%+ |

Coverage is a minimum bar, not a goal. 100% coverage with bad tests is worse than 70% coverage with good tests.

---

## CI Requirements

All of these must pass before a PR can merge:

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] TypeScript / type checker passes (if applicable)
- [ ] Linter passes with zero errors
- [ ] No new security vulnerabilities introduced (audit)
- [ ] Coverage does not drop below baseline

---

## Test File Conventions

```
apps/api/
  src/
    services/
      users.service.ts
      users.service.test.ts         ← unit test alongside source
    repositories/
      users.repository.ts
      users.repository.test.ts      ← integration test alongside source

apps/web/
  src/
    components/
      UserCard.tsx
      UserCard.test.tsx             ← component + snapshot tests alongside source

tests/
  e2e/
    user-management.e2e.ts          ← end-to-end tests in dedicated folder
  fixtures/
    users.fixture.ts                ← shared test data factories
```
