# docs/architecture/file-and-module-naming.md

# File and Module Naming

## Goal
Use one practical naming convention that is easy to scan, easy for coding agents to apply, and compatible with Next.js App Router conventions.

This is a forward-looking policy for incremental adoption. It does not require a big-bang rename.

## Current Repository Pattern Summary
The repository currently mixes several naming styles:

- Next.js entry files in `app/` already use framework-required lowercase names such as `page.tsx`, `layout.tsx`, `loading.tsx`, and `route.ts`
- React component files are mostly PascalCase such as `IssueDetails.tsx` and `TopBar.tsx`
- non-component modules are mixed between kebab-case, camelCase, and PascalCase such as `filter-read.ts`, `listUtils.ts`, and `FilterService.ts`

## Standard Convention

### 1. `app/` files
Use standard Next.js App Router naming exactly where the framework expects it:

- `page.tsx`
- `layout.tsx`
- `route.ts`
- `loading.tsx`
- `not-found.tsx`
- `error.tsx`
- `default.tsx`
- `template.tsx`
- `global-error.tsx`

Route folder names in `app/` should be lowercase and URL-shaped:

- static segments: lowercase kebab-case when a segment contains multiple words
- dynamic segments: keep Next.js bracket syntax such as `[publisher]` and `[...slug]`
- route groups and private folders: follow normal Next.js syntax such as `(group)` and `_private`

Do not invent custom casing in `app/` filenames when Next.js already defines the filename.

### 2. React component files
Use PascalCase for files that primarily export a React component.

Examples:

- `IssueDetails.tsx`
- `TopBar.tsx`
- `FilterFormClient.tsx`

Use the same rule for component-like React context providers and client shells when the file's main export is a React component.

### 3. React hooks
Use camelCase with the `use` prefix for hook files.

Examples:

- `usePendingNavigation.ts`
- `useResolvedImageUrl.ts`

This keeps hook names aligned with normal React symbol naming.

### 4. Non-component modules
Use lowercase kebab-case for non-component, non-hook modules across:

- `src/lib/`
- `src/services/`
- `src/util/`
- `src/types/`
- `src/worker/`

Examples:

- `filter-read.ts`
- `slug-builder.ts`
- `issue-details-read.ts`
- `filter-conflict-resolution.ts`

This includes service modules. Prefer `story-service.ts` over `StoryService.ts` for new files.

### 5. Test files
Name tests after the file they verify:

- component tests: `IssueDetails.test.tsx`
- hook tests: `usePendingNavigation.test.ts`
- non-component module tests: `filter-read.test.ts`

When colocated next to a Next.js special file, keep the special filename and append `.test`:

- `page.test.tsx`
- `route.test.ts`

## Incremental Migration Posture

- New files must follow this convention.
- Existing files are not renamed just for consistency.
- Rename legacy files only when they are already being touched for meaningful work, or in dedicated cleanup changes.
- Avoid rename-only churn in feature work unless the rename is part of an approved cleanup scope.

## Legacy Compatibility Rules
During migration, it is acceptable for old and new naming styles to coexist in the same area.

When touching legacy files:

- keep imports stable unless there is a clear reason to rename
- prefer applying the convention to newly added sibling files
- if a file is renamed in the future, do it in a focused cleanup change with import updates and verification

## Rule of Thumb
Ask this before creating a file:

- Is Next.js expecting a special filename in `app/`? Use the framework filename.
- Is the main export a React component? Use PascalCase.
- Is the main export a React hook? Use `use` camelCase.
- Everything else: use lowercase kebab-case.
