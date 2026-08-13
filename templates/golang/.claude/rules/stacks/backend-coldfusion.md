---
paths:
  - "**/*.cfc"
  - "**/*.cfm"
---

# Stack Rules: Adobe ColdFusion / Lucee (Backend)

Append to `.claude/rules/coding-standards.md` for backend stacks containing ColdFusion (CFML).

---

## Component Structure

ColdFusion components (CFCs) follow the same layered separation as other backends.

```cfm
component displayname="UserService" {

    property name="userRepository" inject="UserRepository";
    property name="mailer" inject="Mailer";

    public User function create(required struct input) {
        var user = userRepository.create(arguments.input);
        mailer.sendWelcome(user);
        return user;
    }
}
```

- **One responsibility per CFC.** Split fat components.
- **Constructor injection** via `property` and `inject` (FW/1, ColdSpring, or DI/1).
- **No hidden state.** Components must not mutate shared scope (session, application) without explicit intent.
- **No business logic in handlers/controllers.** Delegate to services.

---

## Script Syntax

Use **CFScript** (script-based CFC syntax) for all new code. Tag-based `<cfif>` in views is acceptable.

```cfm
// CORRECT — CFScript
component {
    public User function create(required struct input) {
        if (!structKeyExists(input, "email")) {
            throw(type="ValidationError", message="email required");
        }
        return repository.create(input);
    }
}

// WRONG — old-style function block
<cffunction name="create">
    <cfargument name="input" type="struct">
    ...
</cffunction>
```

---

## Validation

Validate at the handler boundary — not inside services or repositories.

```cfm
public function handleCreate(required struct rc) {
    var validation = validateUserInput(rc.form);
    if (!validation.success) {
        render().data({ error = validation.errors }).status(400);
        return;
    }
    var user = userService.create(validation.data);
    render().data({ data = user }).status(201);
}
```

- Never trust raw form/URL variables. Validate before use.
- Typed errors for business rule violations — not generic exceptions.

---

## Database — Query Parameters

**Always use `<cfqueryparam>`** for any user-provided value. No string concatenation.

```cfm
// CORRECT — parameterized
queryExecute("SELECT * FROM users WHERE id = :id AND tenant_id = :tenantId",
    { id = { value = arguments.id, cfsqltype = "cf_sql_varchar" },
      tenantId = { value = arguments.tenantId, cfsqltype = "cf_sql_varchar" } });

// WRONG — string interpolation
queryExecute("SELECT * FROM users WHERE id = '#arguments.id#'");
```

- Use `queryExecute` (Lucee) or `<cfquery>` with `<cfqueryparam>`.
- Store procedures via `storedProcedure` with param binding.

---

## Soft Deletes and Timestamps

- Every mutable table has `created_at`, `updated_at`, `deleted_at`.
- Use soft deletes: `WHERE deleted_at IS NULL` — no `DELETE FROM` statements on business entities.
- Set timestamps via DB triggers or application-level `beforeInsert` / `beforeUpdate` hooks.

---

## Error Handling

- Throw typed errors for business failures: `throw(type="NotFoundError", message="...")`.
- Catch at the handler level — never silently swallow exceptions.
- Log with context: `{ component, method, tenant_id, user_id }`.
- Never expose stack traces or raw CFML error output to the client.

---

## Testing

```bash
# TestBox (BDD framework for ColdFusion)
testbox run --reporter json
```

- Use TestBox for unit and integration tests.
- Mock external services and databases — test the service logic.
- Integration tests for repositories use a real test database.

---

## Commands Reference

```bash
testbox run                           # TestBox runner
cfml lint                             # CFLint (static analysis)
```

---

## Framework Conventions

- **FW/1**: Use the framework's service layer and bean factory. Don't bypass the DI container.
- **Lucee**: Use `application.cfc` for application-scoped configuration and DI.
- **Box**: Use CommandBox tasks and TestBox for testing.
- Keep config in `Application.cfc` or a dedicated `config/` component — not scattered across handlers.

---

## Notes

ColdFusion's dynamic nature makes strict typing harder. Use:
- CFScript typed returns: `public string function getName()` not `public function getName()`
- Validate all inputs at handler boundaries
- No global `variables` scope mutation in service-layer components
- Comment non-obvious decisions — dynamic scoping can be opaque to other developers