---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
---

# Stack Rules: Java + Spring (Backend)

Append to `.claude/rules/coding-standards.md` for backend stacks containing Java or Spring.

---

## Layer Separation

Controllers handle HTTP. Services hold business logic. Repositories handle data access. Entities are pure.

```java
// Controller — HTTP only
@RestController
public class UserController {
    private final UserService userService;

    @PostMapping("/users")
    public ResponseEntity<UserDto> create(@Valid @RequestBody CreateUserRequest req) {
        UserDto created = userService.create(req);
        return ResponseEntity.status(201).body(created);
    }
}

// Service — business logic
@Service
public class UserService {
    private final UserRepository userRepository;

    public UserDto create(CreateUserRequest req) {
        // orchestration, validation, domain logic
        return userRepository.save(req.toEntity());
    }
}

// Repository — data access
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByIdAndTenantId(UUID id, UUID tenantId);
}
```

**No @Transactional in controllers. No DB calls in controllers or services.**

---

## Validation

- Use **Bean Validation** (`@Valid`, `@NotBlank`, `@Email`) at the controller boundary.
- Validate once at the API layer — not in both controller and service.
- Custom validators for complex rules go in `@Constraint` implementations.

```java
// CORRECT — validated at controller
public ResponseEntity<UserDto> create(@Valid @RequestBody CreateUserRequest req) { ... }

// WRONG — manual validation in service
if (req.getEmail() == null || req.getEmail().isBlank()) {
    throw new IllegalArgumentException("Email required");
}
```

---

## DTOs vs Entities

- **Entities** are database-mapped classes. No exposed fields, use getters/setters.
- **DTOs** are for API contracts. Immutable where possible.
- **Never return JPA entities from controllers.** Map to DTOs first.
- Use MapStruct or manual mappers — no copying fields by hand.

---

## Transaction Boundaries

- `@Transactional` on service methods, not controllers.
- Keep transactions short — no external API calls inside a transaction.
- Use `@Transactional(readOnly = true)` for read-only queries.

```java
@Service
public class OrderService {
    @Transactional
    public OrderDto create(CreateOrderRequest req) { ... }

    @Transactional(readOnly = true)
    public List<OrderDto> listByTenant(UUID tenantId) { ... }
}
```

---

## Exception Handling

- Domain exceptions are runtime exceptions — no checked exceptions for business errors.
- Use `@ControllerAdvice` to map exceptions to HTTP responses.
- Never expose stack traces or raw messages to clients.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorDto> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(404)
            .body(new ErrorDto("NOT_FOUND", ex.getMessage()));
    }
}
```

---

## Spring Security

- Use method security (`@PreAuthorize`) for fine-grained access control.
- Deny by default — explicit permission required.
- Tenant context set via request filter, not passed as parameter.

---

## Testing

```bash
./gradlew test                  # unit tests (JUnit 5)
./gradlew test --tests '*IntegrationTest'   # integration
```

- Use `@SpringBootTest` for integration tests.
- Use `@Testcontainers` for real databases in integration tests — not mocks.
- Factories or builders for test data — not `new User()` scattered in tests.

---

## Commands Reference

```bash
./gradlew checkstyleMain        # Checkstyle (style)
./gradlew spotlessApply         # Spotless (format)
./gradlew test                  # JUnit 5
./gradlew dependencyCheckAnalyze  # CVE check
```