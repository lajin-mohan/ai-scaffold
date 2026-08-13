---
paths:
  - "**/*.php"
  - "**/composer.json"
---

# Stack Rules: PHP + Laravel (Backend)

Append to `.claude/rules/coding-standards.md` for backend stacks containing PHP and Laravel.

---

## Controllers

Keep controllers thin. They handle HTTP — nothing else.

```php
// CORRECT — validates and delegates
public function store(StoreUserRequest $request): JsonResponse
{
    $user = $this->userService->create($request->validated());
    return new JsonResponse(['data' => $user], 201);
}

// WRONG — logic in controller
public function store(Request $request): JsonResponse
{
    $data = $request->validate(['email' => 'required|email']);
    $user = User::create([...]);
    Mail::send(...);
    return response()->json($user);
}
```

---

## Validation — Form Requests

Never validate with inline rules in the controller. Use Form Request classes.

```php
// CORRECT
class StoreUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email:rfc,dns'],
            'name'  => ['required', 'string', 'max:255'],
        ];
    }
}
```

---

## Authorization — Policies and Gates

Use Laravel Policies for model-level authorization, Gates for simple checks.

```php
// WRONG — authorization in controller
if (!Auth::user()->can('manage-users')) {
    abort(403);
}

// CORRECT — policy method
public function create(User $user): bool
{
    return $user->can('users:create');
}
```

---

## Business Logic — Service Classes

Extract complex workflows into service classes. Keep Eloquent queries in repositories.

```php
// app/Services/UserService.php
class UserService
{
    public function __construct(
        private readonly UserRepository $repo,
        private readonly Mailer $mailer,
    ) {}

    public function create(array $data): User
    {
        $user = $this->repo->create($data);
        $this->mailer->sendWelcome($user);
        return $user;
    }
}
```

---

## Eloquent

- **No hidden query side effects.** Scopes must be explicit. Don't use global scopes without documented intent.
- **Use `$casts`** for type safety on model attributes — not raw attribute access.
- **No mass assignment without `$fillable`** — explicitly declare allowed fields.
- **Soft deletes** via `Illuminate\Database\Eloquent\SoftDeletes` — no hard deletes.

---

## Migrations

- Always reversible — use `$table->dropColumn()` or `down()` methods.
- `NOT NULL` columns require a default unless pre-populated.
- No table locks on large tables — use `CREATE INDEX CONCURRENTLY`.

```php
// WRONG — not concurrent, locks table
Schema::table('users', function (Blueprint $table) {
    $table->index(['tenant_id', 'email']);
});

// CORRECT — concurrent, no lock
DB::statement('CREATE INDEX CONCURRENTLY idx_users_tenant_email ON users (tenant_id, email)');
```

---

## Queues, Jobs, Events

- Jobs must be idempotent — the same job must be safe to run twice.
- Events are the canonical record of truth for state changes.
- Always dispatch after the primary operation commits — not before.

```php
// WRONG — dispatch before confirm
DB::transaction(function () {
    $order = Order::create([...]);
    SendOrderConfirmation::dispatch($order);
    return $order;
});

// CORRECT — after commit
$order = DB::transaction(function () {
    return Order::create([...]);
});
SendOrderConfirmation::dispatch($order);
```

---

## Testing

```bash
./vendor/bin/phpunit --testsuite=unit    # unit
./vendor/bin/phpunit --testsuite=integration  # integration
./vendor/bin/pest                    # Pest
```

- Use factories for test data — not `User::create(['email' => 'test@test.com'])`.
- Integration tests use a real database (test DB or in-memory SQLite).
- Never mock the repository — test the real service with a real or test-double repository.

---

## Commands Reference

```bash
./vendor/bin/phpstan analyse --level=max    # PHPStan (max strictness)
./vendor/bin/pint --test                    # Laravel Pint (style)
./vendor/bin/phpunit                        # PHPUnit
composer audit                             # CVE check
```
