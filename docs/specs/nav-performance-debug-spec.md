# Nav Performance Debug Spec

## Goal

Make the sidebar initialization bottlenecks measurable so large-branch and deep-link blocking can be debugged with timestamps and browser performance data instead of subjective feel alone.

## Scope

- add temporary-but-safe performance instrumentation for sidebar initialization
- support debug-only activation through an explicit local flag
- record critical stages such as nav-state fetch, selected-path readiness, and reveal scroll timing
- capture browser long tasks while sidebar initialization is active

## Non-Goals

- changing route behavior or navigation semantics
- redesigning the sidebar
- introducing permanent user-facing UI for performance telemetry

## User-Visible Behavior

- normal users should see no behavior change
- developers can enable nav debugging and inspect timing output for problematic routes

## Architectural Placement

- debug helpers stay in `src/components/nav-bar/` because they only instrument navigation UI behavior
- instrumentation may be triggered from adjacent presentation shells such as the persistent catalog chrome
- no Prisma, service, or route logic changes are required

## Risks

- overly noisy instrumentation can make debugging harder if too many events fire
- debug mode must stay opt-in so it does not affect normal runtime behavior

## Acceptance Criteria

- a developer can enable nav debug mode explicitly
- nav-state fetch timing is recorded
- selected-path initialization timing is recorded
- reveal-scroll timing is recorded
- browser long tasks are captured when supported
- `npm run build` succeeds
- `npm run test:a11y:pa11y` continues to pass
