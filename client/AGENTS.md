# Client Instructions

These instructions extend the repository root `AGENTS.md` for all files under `client/`.

## Stack and structure

- Next.js 14 App Router, React 18, TypeScript, and Tailwind CSS 3.
- Icons: `lucide-react`; do not use emoji as interface icons.
- Server state: TanStack Query. Query keys belong in `src/lib/query-keys.ts`.
- Generated-layout loading: `boneyard-js`, configured by `boneyard.config.json`.
- Language state: `LanguageProvider`; the selected locale is persisted in `localStorage`.
- API calls belong in `src/services`; reusable stateful logic belongs in `src/hooks`.
- Shared UI primitives belong in `src/components/ui`.

## UI rules

- Brand accent is `#154a9b`; use white and cool neutral surfaces around it.
- Maintain Vietnamese and English labels through the existing i18n files.
- Use rounded corners, restrained blue-tinted shadows, and clear hover/active/focus states.
- Use icons for compact table actions and the shared custom `Tooltip`; do not use native `title`.
- Create and edit actions open a `Modal`; delete actions use `ConfirmDialog`.
- Use `CustomSelect` instead of browser-native styled selects in managed admin screens.
- Sidebar must remain collapsible. Collapsed navigation icons must be centered and have tooltips.
- Preserve responsive behavior: desktop enhancements must fall back cleanly below `md`.
- Do not introduce gradients, neon glows, excessive animation, or oversized dashboard decoration.
- Keep loading, empty, error, disabled, hover, active, and focus states implemented.

## Query and cache rules

- Do not replace TanStack Query with ad-hoc `useEffect` fetching.
- Choose query keys from `queryKeys`; never scatter string keys across components.
- First access may call the API. Fresh cached data should not refetch on mount or window focus.
- Use appropriate `staleTime`: academic reference data may be cached longer than mutable lists.
- After CRUD, update affected cached entities from the mutation response when safe.
- Invalidate only when direct cache reconciliation cannot guarantee correctness.
- Clear user-specific query cache on logout.
- Search inputs use reusable `useDebounce`; the current user search delay is 500 ms.

## Shared building blocks (mandatory reuse)

Before writing UI or state logic, use the existing primitive. Native elements are allowed only
inside `src/components/ui/`, where the primitives themselves are implemented.

| Need | Use | Do not use |
|---|---|---|
| Text button | `Button` | `<button>` |
| Icon-only action | `IconButton` (includes `Tooltip` + `aria-label`) | `<button>` with an icon, native `title` |
| Text field | `Input` | `<input type="text/email/password/search/number/date">` |
| Select | `CustomSelect` / `SearchableCombobox` | `<select>` |
| Create/edit form | `Modal` or `OpsDetailDrawer` | ad-hoc overlay `div` |
| Delete/irreversible confirm | `ConfirmDialog` | `window.confirm`, `alert`, `prompt` |
| Data table | `SheetTable` + `SheetToolbar` + `useColumns` | new hand-written `<table>` for list screens |
| Toast | `useToast().showToast` | custom toast markup |
| Request with toast/error | `useApi` (or `useCrudManagement`/`useBulkAction`) | hand-written `try/catch` + generic toast |
| Paginated list | `usePaginatedData` | local page state + manual fetch |
| URL search/filter/page | `useUrlQueryState` | manual `history.replaceState` |
| Search debounce | `useDebounce(value, 500)` | other delays, `setTimeout` |
| Query keys | `queryKeys` in `src/lib/query-keys.ts` | `queryKey: ["admin", ...]` literals |
| Permission check | `useAdminAccess().can("x.y")` | role code checks |

Checkboxes, radios, file and hidden inputs may stay native. If a primitive is missing a needed
variant, extend the primitive in `src/components/ui/` instead of forking it in a screen.

## RBAC in the client

- Show, hide, or disable controls with `access.can("resource.action")` only.
- Never compare `role.code`, `session.user.role`, or `profile.roles` against a role name. Use
  `profile.isStudent` / `session.user.isStudent` for the student/staff distinction, and server
  flags (for example `isProtected`) for records that cannot be edited or deleted.
- Role pickers list roles returned by the API and display `displayName || code`; never build a
  hardcoded role list. Send `roleIds` to the server.
- `AdminResourceAccess` takes a `permission`, not `allowedRoles`.

## Text and error rules

- No Vietnamese or English UI text in `.ts`/`.tsx` outside `src/i18n/`. This includes toasts,
  placeholders, `aria-label`, column titles, empty states, and fallback error messages.
- No `locale === "vi" ? "..." : "..."` or `vi ? "..." : "..."` for text. Add a key to both
  locales in `src/i18n/` instead. `locale === "vi" ? "vi-VN" : "en-US"` for formatting is allowed.
- Error toasts and inline errors show the server message for 4xx:
  `extractServerErrorMessage(error, t.<fallbackKey>)` or `useApi`. Never replace a server message
  with a generic sentence such as "Không thể lưu".

## Component and hook rules

- Components render UI; request orchestration and reusable behavior belong in hooks.
- Do not place a complete page, all modals, all request logic, and all types in one file.
- Labels sit above form fields. Errors appear near their field or form.
- Use semantic buttons and accessible labels for icon-only controls.
- Effects, timers, subscriptions, and document listeners must include cleanup.
- Keep formatted JSX readable; run `npm.cmd run format` after frontend edits.

## Loading rules

- Page and data loading should use Boneyard skeletons rather than textual loaders or large spinners.
- Small progress indicators inside an action button are allowed when they communicate that action only.
- When a captured layout changes materially, regenerate Boneyard bones as documented by the library.

## Required checks

```powershell
npm.cmd run format
npm.cmd run format:check
npm.cmd run lint:design -- --changed main
npx.cmd tsc --noEmit
```

`lint:design` (`scripts/check-design-rules.mjs`) enforces the rules above. Changed files must have
zero errors. Suppress a finding only when it is a genuine exception, with a reason:
`// design-ignore-next-line <rule> -- <reason>`. Run `node scripts/check-design-rules.mjs
--list-rules` to see all rules.

Run `npm.cmd run build` for routing, provider, dependency, or production-rendering changes.

