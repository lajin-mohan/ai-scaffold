---
description: Writes complete runnable tests with assertions (unit, integration, component, snapshot)
---

# Command: /gen-tests

Generates a complete, runnable test suite for the current feature. Reads the spec and implementation, builds a test matrix, and writes full test code with assertions — not stubs. Invokes the `qa-reviewer` agent to validate business-rule coverage.

## Usage

```
/gen-tests                                    # Generate tests for current feature
/gen-tests src/services/applications.ts       # Generate tests for a specific file
/gen-tests --unit                             # Unit tests only
/gen-tests --integration                      # Integration tests only
/gen-tests --e2e                              # End-to-end test scenarios only
/gen-tests --snapshot                         # UI snapshot/visual regression tests only
```

## Process

1. **Read the spec** — find the relevant BRD section or acceptance criteria
2. **Read the implementation** — parse the actual source file(s) to understand function signatures, inputs, outputs, error paths, and state transitions
3. **Build test matrix** — map every code path to a scenario: happy path / edge cases / failures / permissions / tenant isolation
4. **Write complete tests** — produce fully runnable test code with real assertions, proper imports, setup/teardown, and fixture data in the project's test framework (`{{TEST_FRAMEWORK}}` — e.g., Jest, Vitest, PHPUnit, pytest)
5. **Write test file to disk** — output to the correct location alongside the source file (see File Conventions below)
6. **Flag coverage gaps** — identify any scenario not covered with risk level

## What "Complete Tests" Means

Do NOT produce stubs with `// TODO` comments. Every generated test must:
- Import the module under test with the correct path
- Set up required fixtures and mocks
- Call the function/endpoint with real inputs
- Assert the exact return value, thrown error, or HTTP response
- Clean up state in `afterEach`/`tearDown` where needed

## Test Matrix

| Category | Scenario | Expected Outcome | Priority |
|---|---|---|---|
| Happy path | Valid input, authorized user | Success response + side effects triggered | P0 |
| Validation | Missing required field | 400 VALIDATION_FAILED with field-level error | P0 |
| Validation | Wrong type or format | 400 VALIDATION_FAILED | P0 |
| Auth | Unauthenticated request | 401 UNAUTHORIZED | P0 |
| Authorization | Insufficient permission | 403 FORBIDDEN | P0 |
| Tenant isolation | Access another tenant's resource | 404 NOT_FOUND | P0 |
| Not found | Valid ID, nonexistent record | 404 NOT_FOUND | P0 |
| Concurrency | Optimistic lock version mismatch | 409 CONFLICT | P1 |
| Boundary | Max length string field | Accepted or rejected per spec | P1 |
| Boundary | Min/max numeric field | Accepted or rejected per spec | P1 |
| State machine | Invalid state transition | 422 UNPROCESSABLE | P1 |
| Idempotency | Same idempotency key sent twice | Same response, no duplicate side effects | P1 |
| Soft delete | Deleted record not returned in list | 200 with record excluded | P1 |
| Pagination | Last page, empty page beyond total | Correct meta, empty data array | P2 |

## Framework-Specific Patterns

### Jest / Vitest (TypeScript)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApplication } from '../services/applications.service'
import { db } from '../db'
import { applicationFactory } from '../tests/fixtures/application.fixture'

describe('createApplication', () => {
  beforeEach(async () => {
    await db.migrate.latest()
  })

  afterEach(async () => {
    await db('applications').truncate()
  })

  it('creates application and returns 201 with id', async () => {
    const input = applicationFactory.build({ title: 'Senior Engineer' })
    const result = await createApplication(input, { tenantId: 'tenant-1', userId: 'user-1' })

    expect(result.id).toBeDefined()
    expect(result.title).toBe('Senior Engineer')
    expect(result.status).toBe('draft')
  })

  it('throws VALIDATION_FAILED when title is missing', async () => {
    await expect(
      createApplication({ title: '' }, { tenantId: 'tenant-1', userId: 'user-1' })
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', field: 'title' })
  })

  it('cannot access another tenant application', async () => {
    const app = await createApplication(applicationFactory.build(), { tenantId: 'tenant-1', userId: 'user-1' })
    await expect(
      getApplication(app.id, { tenantId: 'tenant-2', userId: 'user-2' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
```

### pytest (Python)

```python
import pytest
from services.applications import create_application
from tests.fixtures.application import application_factory

@pytest.fixture(autouse=True)
def clean_db(db_session):
    yield
    db_session.execute("TRUNCATE applications")
    db_session.commit()

def test_creates_application_returns_id(db_session):
    data = application_factory(title="Senior Engineer")
    result = create_application(data, tenant_id="tenant-1", user_id="user-1")
    assert result["id"] is not None
    assert result["status"] == "draft"

def test_raises_validation_error_when_title_missing(db_session):
    with pytest.raises(ValidationError) as exc:
        create_application({"title": ""}, tenant_id="tenant-1", user_id="user-1")
    assert exc.value.code == "VALIDATION_FAILED"
    assert exc.value.field == "title"

def test_tenant_isolation_returns_not_found(db_session):
    app = create_application(application_factory(), tenant_id="tenant-1", user_id="user-1")
    with pytest.raises(NotFoundError):
        get_application(app["id"], tenant_id="tenant-2", user_id="user-2")
```

### PHPUnit (PHP/Laravel)

```php
class CreateApplicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_application_with_draft_status(): void
    {
        $user = User::factory()->create(['tenant_id' => 'tenant-1']);
        $this->actingAs($user);

        $response = $this->postJson('/api/v1/applications', ['title' => 'Senior Engineer']);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('error', null);
    }

    public function test_returns_422_when_title_missing(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->postJson('/api/v1/applications', []);

        $response->assertStatus(400)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonPath('error.fields.title', fn($v) => filled($v));
    }

    public function test_tenant_isolation_returns_404(): void
    {
        $app = Application::factory()->create(['tenant_id' => 'tenant-1']);
        $user = User::factory()->create(['tenant_id' => 'tenant-2']);
        $this->actingAs($user);

        $this->getJson("/api/v1/applications/{$app->id}")->assertStatus(404);
    }
}
```

## Snapshot / Visual Regression Tests

For frontend components, generate snapshot tests alongside unit tests.

### React (Vitest + @testing-library/react)

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ApplicationCard } from '../components/ApplicationCard'
import { applicationFactory } from '../tests/fixtures/application.fixture'

describe('ApplicationCard', () => {
  it('renders title and status badge', () => {
    render(<ApplicationCard application={applicationFactory.build({ title: 'Eng Role', status: 'active' })} />)
    expect(screen.getByText('Eng Role')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('active')
  })

  it('shows empty state when no applications', () => {
    render(<ApplicationList applications={[]} />)
    expect(screen.getByText(/no applications/i)).toBeInTheDocument()
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<ApplicationCard application={applicationFactory.build()} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('matches snapshot', () => {
    const { container } = render(<ApplicationCard application={applicationFactory.build()} />)
    expect(container).toMatchSnapshot()
  })
})
```

## File Conventions

Write test files alongside the source file they test:

```
src/
  services/
    applications.service.ts
    applications.service.test.ts     <- unit tests written here
  repositories/
    applications.repository.ts
    applications.repository.test.ts  <- integration tests written here
  components/
    ApplicationCard.tsx
    ApplicationCard.test.tsx         <- component + snapshot tests

tests/
  e2e/
    application-flow.e2e.ts          <- E2E tests
  fixtures/
    application.fixture.ts           <- shared factory functions
```

## Output Format

```
## Test Plan — [Feature Name]

### Test Matrix
[Full table — every scenario mapped]

### Generated Test Files

#### [path/to/service.test.ts] — Unit Tests
[Complete runnable test code]

#### [path/to/repository.test.ts] — Integration Tests
[Complete runnable test code]

#### [path/to/Component.test.tsx] — Component Tests
[Complete runnable test code including snapshot]

### Coverage Gaps
- [scenario] — not covered, risk: HIGH / MEDIUM / LOW

### Estimated Test Count
Unit: [n] · Integration: [n] · Component: [n] · E2E: [n]
```

## Workflow

`/gen-tests` codifies what `/qa` found into automated tests. Use them together:

| Step | Command | What it does |
|---|---|---|
| 1 | `/review` | Static analysis — catches code-level issues |
| 2 | `/qa` (if UI findings) | Live browser — catches rendering/interaction issues |
| 3 | `/gen-tests` | Generate automated tests for every verified behavior |
| 4 | Run tests in CI | Regression prevention going forward |

`/qa` verifies the feature works in a browser. `/gen-tests` locks that verification into the test suite so it never regresses silently.
