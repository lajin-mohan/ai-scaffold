# Stack Rules: React (Frontend)

Append to `.claude/rules/coding-standards.md` for frontend stacks containing React.

---

## Component Rules

- **One component per file.** No multi-component files.
- **Props typed with interfaces** — no `any`, no `React.FC` with implicit props.
- **No business logic in components.** Components display and capture input — nothing else.
- **No direct API calls.** Use a data-fetching layer (React Query, SWR, custom hooks) or store actions.

```tsx
// CORRECT — typed props, no business logic
interface UserCardProps {
  user: User
  onEdit: (id: string) => void
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div>
      <span>{user.name}</span>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  )
}

// WRONG — implicit any, API call in component
export function UserCard({ user }) {
  const { data } = useQuery(['user', user.id], () => fetch(`/api/users/${user.id}`))
  ...
}
```

---

## State Management

- **UI state** (open/closed, focused): use `useState`, `useReducer`, or component-local state.
- **Server state** (user, permissions, fetched data): React Query, SWR, or a typed store.
- **Application state** (auth, tenant): a global store with typed selectors.
- **No derived state stored** — compute from source.
- **No prop drilling beyond 2 levels** — use context or a store.

---

## Loading, Error, and Empty States

Every component that fetches or displays data must handle all four states:

- **Loading** — skeleton or spinner, not blank space
- **Error** — error message with retry action, not a blank screen
- **Empty** — meaningful empty state with guidance, not "no data"
- **Populated** — the actual data

```tsx
if (isLoading) return <UserCardSkeleton />
if (isError) return <ErrorMessage onRetry={refetch} />
if (!user) return <EmptyState message="No user found" />
return <UserCard user={user} />
```

---

## Forms

- Use a form library (React Hook Form, Formik) — not uncontrolled inputs.
- Validation at the field level with schema validation (Zod, Yup).
- Submit handlers are async — handle pending, success, and error states.
- No `any` types on form field values.

---

## Accessibility

- Semantic HTML first: `<button>` for actions, `<form>` for inputs, `<nav>` for navigation.
- ARIA attributes when semantic HTML is insufficient.
- Focus management on modal open/close.
- Keyboard navigation for all interactive elements.
- `aria-live` for dynamic content updates.
- **WCAG 2.1 AA minimum** — test with keyboard and a screen reader.

---

## Styling

- **Design system tokens only** — no hardcoded colors, spacing, or font sizes.
- **CSS modules, Tailwind, or styled-components** — not raw `style={{}}` props.
- **Mobile-first** — base styles for 390px, add breakpoints upward.
- **No `!important`** — fix specificity instead.
- No inline styles except for genuinely dynamic values computed at runtime.

---

## Testing

```bash
npm run test:unit    # Vitest + React Testing Library
npm run test:e2e     # Playwright
```

- Use `@testing-library/react` — test behaviour, not implementation.
- Snapshot tests for design system components (cards, badges, modals).
- No `describe.only`, no `test.skip` in the codebase.
- Coverage target: 60%+ for component layer.

---

## Commands Reference

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test:unit     # Vitest / React Testing Library
npm run test:e2e      # Playwright
npm run test:visual   # Chromatic (visual regression)
```