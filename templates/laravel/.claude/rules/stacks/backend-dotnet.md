---
paths:
  - "**/*.cs"
  - "**/*.csproj"
  - "**/*.sln"
---

# Stack Rules: .NET / C# (Backend)

Append to `.claude/rules/coding-standards.md` for backend stacks containing .NET or C#.

---

## Layer Separation

Controllers handle HTTP. Services hold business logic. Repositories handle data access. Entities are pure domain objects.

```csharp
// Controller — HTTP only
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService) => _userService = userService;

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest req)
    {
        var user = await _userService.CreateAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }
}

// Service — business logic
public class UserService : IUserService
{
    private readonly IUserRepository _repo;
    private readonly IMailer _mailer;

    public UserService(IUserRepository repo, IMailer mailer)
    {
        _repo = repo;
        _mailer = mailer;
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest req)
    {
        var user = await _repo.CreateAsync(req);
        await _mailer.SendWelcomeAsync(user);
        return user;
    }
}
```

**No `await` in controllers without a service call. No DB access in controllers.**

---

## Validation

- Use **Data Annotations** (`[Required]`, `[EmailAddress]`) or **FluentValidation** for API input.
- Validate at the controller boundary — not in both controller and service.
- Custom validators for complex rules.

```csharp
// CORRECT — validated at controller
public async Task<ActionResult<UserDto>> Create([FromBody][Required] CreateUserRequest req)
{
    var user = await _userService.CreateAsync(req);
    return Created(user);
}

// WRONG — manual validation in service
if (string.IsNullOrWhiteSpace(req.Email))
    throw new ArgumentException("Email required");
```

---

## DTOs vs Entities

- **Entities** are database-mapped classes (EF Core). Not returned from controllers.
- **DTOs** are for API contracts. Immutable where possible (`record` types).
- **Never return EF entities from controllers** — map to DTOs first.
- Use `Mapster` or manual mappers — not hand-coded field copying.

---

## Dependency Injection

- Use the built-in DI container in `Program.cs`.
- Register interfaces → implementations, not concrete classes.
- Don't use `ServiceLocator` pattern inside business logic.

```csharp
// Program.cs
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IMailer, SendGridMailer>();
```

---

## Entity Framework

- **No `AsNoTracking`** unless the entity is read-only and won't be updated.
- **Soft deletes** via global query filters — not row deletion.
- **Parameterized queries** — no string interpolation in LINQ where it matters.
- **Migrations** via `dotnet ef migrations` — no manual schema changes.

---

## Async

- **Use `async/await`** on all I/O — DB calls, HTTP, file access.
- **Never `.Result` or `.GetAwaiter().GetResult()`** in a request path — causes deadlocks.
- Every `async` method returns `Task<T>` — not `T`.

---

## Error Handling

- Use typed exceptions. Map to HTTP responses in middleware or exception filters.
- Never expose stack traces or raw exception messages to clients.

```csharp
// Global exception filter
public class GlobalExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        context.Result = context.Exception switch
        {
            NotFoundException ex => new NotFoundObjectResult(new ErrorDto("NOT_FOUND", ex.Message)),
            ValidationException ex => new BadRequestObjectResult(new ErrorDto("VALIDATION_FAILED", ex.Message)),
            _ => new ObjectResult(new ErrorDto("INTERNAL_ERROR", "An unexpected error occurred"))
            {
                StatusCode = 500
            }
        };
    }
}
```

---

## Testing

```bash
dotnet test                           # unit tests (xUnit/NUnit)
dotnet test --filter Category=Integration  # integration (real DB)
```

- Use `Moq` for mocking interfaces.
- Integration tests use a real test database (Testcontainers).
- Factory methods for test data — not `new User()` scattered in tests.
- `FluentAssertions` for readable assertions.

---

## Commands Reference

```bash
dotnet build                      # build + compile
dotnet format                     # format (Astyle or dotnet-format)
dotnet analyzers                  # Roslyn analyzers
dotnet test                       # tests
dotnet test --filter Integration # integration tests
dotnet audit                     # CVE check (NuGet audit)
```
