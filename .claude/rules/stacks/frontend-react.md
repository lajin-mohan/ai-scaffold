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

- **Use CSS Variables for theming** — this is the preferred pattern for all color work:
  ```tsx
  // CORRECT — CSS variable pattern (auto dark mode support)
  className="bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]"

  // DEPRECATED — Tailwind dark: variants (being phased out)
  className="bg-surface dark:bg-surface-dark text-ink dark:text-ink-light"
  ```
- **Design system tokens only** — no hardcoded colors, spacing, or font sizes.
- **Organization branding aware** — brand/theme colors come from organization settings through CSS variables, with defaults only in centralized `index.css` files.
- **Available tokens** (defined in `apps/web/src/index.css`):
  - `--color-action-primary` — primary actions, links, focus
  - `--color-action-primary-hover` — primary hover/pressed
  - `--color-action-primary-soft` — subtle active backgrounds
  - `--color-bg-surface` — cards, modals, inputs, header
  - `--color-bg-muted` — subtle nested areas, table headers, filter bars
  - `--color-text-primary` — headings, body text
  - `--color-text-secondary` — labels, captions, muted text
  - `--color-text-muted` — placeholder, disabled
  - `--color-border` — borders
  - `--color-border-strong` — emphasized borders
  - `--color-border-focus` — focus rings
  - `--color-success/warning/danger` — semantic status colors
- **CSS modules, Tailwind, or styled-components** — not raw `style={{}}` props.
- **Desktop-first product experience** — enterprise workflows are designed for desktop first, then adapted cleanly to tablet and mobile.
- **Responsive verification** — validate tablet and mobile layouts, including an approximately 390px mobile viewport.
- **Theme-aware implementation** — every page and component supports light and dark themes through CSS variables.
- No hardcoded page or brand colors; backgrounds, text, borders, focus rings, chart colors, badges, and status colors must use tokens that can be overridden by organization branding.
- Theme switching must preserve page state: filters, form input, active tabs, selected rows/cards, and open drawers.
- At 390px, primary workflows must remain complete; do not hide create/edit/submit/approve/save/cancel actions behind unavailable desktop-only controls.
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
- Frontend/full-stack browser verification must include desktop light, desktop dark, mobile light, and mobile dark checks.
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
