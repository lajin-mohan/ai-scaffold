---
name: frontend-patterns
description: Apply this project's frontend architecture, component, state-management, data-fetching, performance, testing, and accessibility patterns. Use when implementing or reviewing frontend code.
---

# Skill: frontend-patterns

Patterns for building the frontend. Adapt to the project's stack (`{{FRONTEND_STACK}}`). Examples use React + TypeScript — translate idioms as needed.

---

## Component Architecture

```
pages/          ← Route-level components. Fetch data, compose layouts.
components/
  ui/           ← Pure presentational: Button, Input, Card, Badge, Table
  features/     ← Domain-specific: CandidateCard, ApplicationStatusBadge
  layouts/      ← App shell: Sidebar, Header, PageLayout
hooks/          ← Data fetching, business logic, shared state
lib/
  api/          ← API client (typed, centralized)
  utils/        ← Pure utility functions
store/          ← Global app state (auth, tenant, permissions)
```

---

## Component Rules

- **One component = one file = one responsibility.**
- **No business logic in components.** Components display and capture input; hooks and services decide.
- **No direct API calls.** Use a data-fetching hook or store action.
- **Props are typed.** No `any`, no untyped `children` without a reason.
- **Every component handles all data states**: loading, error, empty, populated.

```tsx
interface UserListProps {
  tenantId: string
  onSelect: (user: User) => void
}

export function UserList({ tenantId, onSelect }: UserListProps) {
  const { data: users, isLoading, error } = useUsers(tenantId)

  if (isLoading) return <UserListSkeleton />
  if (error) return <ErrorMessage message="Failed to load users" />
  if (!users?.length) return <EmptyState message="No users found" />

  return (
    <ul>
      {users.map(user => (
        <UserListItem key={user.id} user={user} onSelect={onSelect} />
      ))}
    </ul>
  )
}
```

---

## Data Fetching Pattern

Centralize API calls. Use a caching layer (React Query, SWR, or equivalent).

```typescript
// lib/api/users.ts
export async function fetchUsers(tenantId: string): Promise<User[]> {
  const response = await apiClient.get(`/users`)
  return response.data
}

// hooks/useUsers.ts
export function useUsers(tenantId: string) {
  return useQuery({
    queryKey: ['users', tenantId],
    queryFn: () => fetchUsers(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// hooks/useCreateUser.ts
export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserInput) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
```

---

## Form Pattern

Validate on blur and on submit. Show field-level errors. Disable submit while loading.

```tsx
function UserForm({ onSubmit }: { onSubmit: (data: UserFormData) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UserFormData>({
    resolver: zodResolver(UserFormSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField label="Email" error={errors.email?.message} required>
        <Input
          {...register('email')}
          type="email"
          placeholder="name@company.com"
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
        Save User
      </Button>
    </form>
  )
}
```

---

## Design System Usage

Always use tokens. Never hardcode page or brand colors.

Brand/theme color tokens must be populated from organization branding settings when available, with project defaults only as centralized fallbacks. Feature code, page code, and component code should reference semantic tokens/CSS variables instead of literal brand hex values.

```tsx
// WRONG
<div style={{ color: '#6B7280', padding: '16px', borderRadius: '8px' }}>

// CORRECT — via Tailwind tokens or CSS variables
<div className="text-secondary p-4 rounded-md">

// CORRECT — via CSS variables in styled components
const Card = styled.div`
  color: var(--color-text-secondary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
`
```

---

## Permission-Based Rendering

Check permissions, not role names.

```tsx
// WRONG
{user.role === 'admin' && <DeleteButton />}

// CORRECT
{user.permissions.includes('users:delete') && <DeleteButton />}

// Better — centralized hook
function usePermission(permission: string): boolean {
  const { user } = useAuth()
  return user?.permissions.includes(permission) ?? false
}

const canDelete = usePermission('users:delete')
{canDelete && <DeleteButton />}
```

---

## Loading State Patterns

Use skeleton screens for content areas, not spinners.

```tsx
// Skeleton for a user card
function UserCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-surface rounded w-3/4 mb-2" />
      <div className="h-3 bg-surface rounded w-1/2" />
    </div>
  )
}

// Spinner only for inline actions (button loading state)
<Button loading={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

---

## Error Boundary Pattern

Wrap route-level components in error boundaries.

```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<PageSkeleton />}>
    <UsersPage />
  </Suspense>
</ErrorBoundary>
```

---

## Accessibility Checklist for Components

- [ ] Interactive elements reachable by keyboard (Tab, Enter, Space, Escape)
- [ ] All form inputs have visible `<label>` (not just placeholder)
- [ ] Error messages linked to input via `aria-describedby`
- [ ] Modals trap focus on open, restore on close
- [ ] Icon-only buttons have `aria-label`
- [ ] Loading states announced via `aria-live` for screen readers
- [ ] Colour is not the only indicator of state (use icon + colour)

---

## Responsive Breakpoints

Desktop-first enterprise workflows. Build the primary experience for desktop, then adapt intentionally for tablet and mobile. Validate the mobile adaptation at approximately 390px.

```css
/* Desktop primary */
.layout { display: grid; grid-template-columns: 256px 1fr; }

/* Tablet adaptation */
@media (max-width: 1279px) {
  .layout { grid-template-columns: 64px 1fr; }
}

/* Mobile adaptation */
@media (max-width: 767px) {
  .layout { display: block; }
}
```
