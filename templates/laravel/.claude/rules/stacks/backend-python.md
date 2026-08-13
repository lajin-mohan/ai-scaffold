---
paths:
  - "**/*.py"
  - "**/pyproject.toml"
  - "**/requirements*.txt"
  - "**/setup.py"
  - "**/setup.cfg"
---

# Stack Rules: Python (Backend)

Append to `.claude/rules/coding-standards.md` for backend stacks containing Python.

---

## Type Hints

- **Always use type hints.** No `Any` without a comment.
- **Strict mode enabled** (`mypy --strict` or `pyright --strict`).
- Function signatures document intent — use them.

```python
# CORRECT
from typing import Sequence
def get_user(user_id: str, tenant_id: str) -> User | None:
    ...

# WRONG — no hints, implicit types
def get_user(user_id, tenant_id):
    ...
```

---

## Data Validation — Pydantic

Validate at every API boundary using Pydantic models. Not `isinstance()` checks or manual validation.

```python
# CORRECT
from pydantic import BaseModel, EmailStr, Field

class CreateUserInput(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    tenant_id: str

# WRONG — manual validation
if not isinstance(data.get('email'), str) or '@' not in data['email']:
    raise ValidationError(...)
```

---

## Layer Separation

Routes/views receive a request and call a service. Services hold business logic. Repositories handle data access.

```python
# routes/users.py
@router.post("/users")
def create_user(input: CreateUserInput, user: User, repo: UserRepository, svc: UserService) -> JSONResponse:
    user = svc.create(input, user)
    return JSONResponse({"data": user.model_dump()}, status_code=201)

# services/users.py
class UserService:
    def create(self, input: CreateUserInput, actor: User) -> User:
        # business logic here
        return self.repo.create(input, actor.tenant_id)
```

**No business logic in route handlers or views.**

---

## Async

- Use `asyncio` and `asyncpg` / `SQLAlchemy[asyncio]` — not blocking calls in async endpoints.
- Every `async` function handles its errors or propagates them.
- Never call `.result()` on a coroutine in a sync context.

---

## Error Handling

Use typed exceptions or Pydantic validation errors. Not bare `raise Exception`.

```python
# CORRECT
class NotFoundError(Exception):
    def __init__(self, resource: str, id: str) -> None:
        super().__init__(f"{resource} {id} not found")
        self.resource = resource
        self.id = id

# WRONG
raise Exception("User not found")
```

Map HTTP status codes at the route/handler layer, not inside services.

---

## Database

- Parameterized queries via SQLAlchemy or raw `cursor.execute(sql, (p1, p2))` — never f-strings or `%` formatting.
- **Soft deletes** — use a `deleted_at` column, not row deletion.
- **Migrations** via Alembic or similar — no raw SQL schema changes.
- Models return Pydantic models or dataclasses, not raw ORM objects.

---

## Testing

```bash
pytest tests/unit/                     # unit tests
pytest tests/integration/             # integration (real DB)
```

- Use pytest fixtures or factory functions for test data.
- Integration tests connect to a real test database — not mocks.
- Unit test pure functions and service classes with test doubles.
- Parametrised tests for multi-case coverage.

---

## Commands Reference

```bash
ruff check .                           # Ruff (lint + import sort)
ruff format .                          # Ruff formatter
pyright                               # Pyright (strict mode)
mypy                                  # MyPy
pytest                                # pytest
pip-audit                             # CVE check
```
