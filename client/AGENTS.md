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
npx.cmd tsc --noEmit
```

Run `npm.cmd run build` for routing, provider, dependency, or production-rendering changes.

