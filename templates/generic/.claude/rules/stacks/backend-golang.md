---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---

# Stack Rules: Go (Backend)

Append to `.claude/rules/coding-standards.md` for backend stacks containing Go.

---

## Error Handling

Go errors are values. Handle them explicitly — no ignored return values.

```go
// CORRECT
user, err := userRepo.FindByID(ctx, id)
if err != nil {
    return nil, fmt.Errorf("find user: %w", err)
}

// WRONG — ignored error
user, _ := userRepo.FindByID(ctx, id)

// WRONG — loss of context
user, err := userRepo.FindByID(ctx, id)
if err != nil {
    return nil, err
}
```

- Wrap errors with `fmt.Errorf("action: %w", err)` to preserve stack and context.
- Define sentinel errors for known failure modes: `var ErrNotFound = errors.New("not found")`.
- Return `nil, err` — not `nil, fmt.Errorf(...)` unless adding context.

---

## Interfaces

Define interfaces where they are **consumed** — not where they are **implemented**.

```go
// CORRECT — consumer defines the interface it needs
type UserFinder interface {
    FindByID(ctx context.Context, id uuid.UUID) (*User, error)
}

// WRONG — interface defined near the implementation
type UserRepository interface {
    FindByID(...)
    Create(...)
    Update(...)
}
```

Small, focused interfaces. `io.Reader`, `io.Writer`, `interface{}` are fine patterns.

---

## Context

- Pass `context.Context` as the first parameter to every function that does I/O.
- Never store a context in a struct.
- Use `context.WithTimeout` for operations with a deadline.
- Cancel long-running operations when the request context is cancelled.

---

## Layer Separation

```
Handler → Service → Repository → Domain
(HTTP)   (logic)    (data)      (pure)
```

- Handlers validate input, check auth, call a service, return a response.
- Services contain all business logic. No DB calls in handlers or services.
- Repositories own data access. Return domain types.
- Domain types are plain structs — no DB tags, no JSON tags, no dependencies.

---

## Project Layout

Follow the standard Go layout or a clean architecture variant:

```
internal/
  domain/     # entities, value objects, domain errors
  service/     # business logic
  repository/  # data access (interface + implementation)
  handler/     # HTTP handlers
cmd/           # entry points
pkg/           # shared packages (used by multiple modules)
```

**No business logic in `cmd/` or `pkg/`** unless it is genuinely shared.

---

## JSON and Encoding

- Use struct tags explicitly. No embedding JSON structs in domain types.
- Define API request/response types separately from domain types.
- Validate at the handler layer using a schema library or manual validation.

```go
type CreateUserRequest struct {
    Email string `json:"email" validate:"required,email"`
    Name  string `json:"name" validate:"required,max=255"`
}
```

---

## Testing

```bash
go test ./...                  # unit tests
go test -tags=integration ./... # integration tests (real DB)
```

- Unit test logic and interfaces, not implementations you don't own.
- Integration tests use a real database — not mocks for the DB.
- Table-driven tests for multi-case coverage.
- Use `testify/require` for assertions that should halt on failure.

---

## Commands Reference

```bash
go fmt ./...                    # gofmt (format)
go vet ./...                    # go vet (static analysis)
golangci-lint run               # golangci-lint (comprehensive)
go test ./...                   # tests
gosec ./...                     # security (CVE)
```
