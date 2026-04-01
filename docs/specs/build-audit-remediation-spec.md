# Build Audit Remediation Spec

## Goal
Reduce the highest-signal accessibility audit failures reported by the existing build-time audit scripts without weakening SEO-relevant server-rendered content.

## Scope
- reproduce the current `pa11y` and `unlighthouse` findings locally
- map the most actionable findings to concrete components
- fix the highest-priority, lowest-risk accessibility issues first
- re-run the existing audit commands to verify the changes

## Non-Goals
- broad visual redesigns
- large performance refactors that require architecture changes
- introducing new audit tooling beyond the existing scripts
- changing domain behavior, routing, metadata, or canonical URL rules unless required for an accessibility fix

## User-Visible Behavior
- interactive elements should no longer be nested in ways that confuse keyboard or assistive technology users
- list markup should better reflect the rendered semantics
- form controls and icon-only actions should expose valid accessible names
- invalid ARIA usage should be removed or corrected where the fix is low risk

## Affected Areas
- `src/components/`
- small supporting tests where a pure helper or rendering contract can be covered safely
- `docs/specs/`
- `docs/plans/`

## Business Rules
- `de` and `us` remain domain scopes, not locales
- SEO-relevant SSR content, canonical routing, and metadata must remain stable
- no business rules are moved into UI components as part of the remediation

## Architectural Placement
- accessibility markup fixes belong in the relevant presentation components under `src/components/`
- any technical helper added for shared rendering concerns must remain UI-safe
- no Prisma or write-path changes are in scope

## Risks
- changing interactive markup can subtly affect click targets, keyboard navigation, or styling
- some audit findings may be false positives caused by third-party UI primitives
- Lighthouse performance issues may remain if the safe fixes are accessibility-only

## Acceptance Criteria
- current audit findings are reproduced locally with the existing scripts
- the highest-priority low-risk accessibility issues are fixed in place
- `npm run lint`, `npm run test:a11y:pa11y`, and at least one `unlighthouse` audit run after the changes
- remaining findings are documented with rationale when not fixed
