# ADR 004: Testing Target Model

## Status
Accepted

## Context
The repository currently has a mixed testing landscape:

- Jest is the current official command via `npm test`
- some tests still use `vitest`
- some UI-oriented tests assume browser-style tooling that is not part of the current safe baseline

This makes the repository harder to extend safely with coding agents because the default testing path is not yet aligned with the full test tree.

The project wants a cleaner AI-first repository before the first real feature. CI/CD is secondary to establishing a clear local testing model first.

## Decision
The target testing model for this repository is:

- **Jest** for unit testing
- **Storybook + Chromatic** for visual snapshot regression testing
- **Playwright** for end-to-end testing

New tests should default to:

- Jest for pure logic, regression, and parity tests
- Jest for unit-level component behavior that can be expressed through composed Storybook stories
- Storybook stories plus Chromatic when the main risk is visual or presentation regression
- Playwright when the behavior is end-to-end, route-level, or depends on real browser workflows

The supported future default does **not** include:

- `vitest` as a repository-standard runner
- mixed Jest/Vitest usage for new tests
- ad hoc browser-style component testing without the agreed Storybook/Chromatic or Playwright path

## Consequences

### Positive
- future agents have one clear default for unit testing
- visual and end-to-end concerns get explicit homes instead of being mixed into one test style
- the repository can move toward a cleaner and more explainable AI-first workflow

### Negative
- existing `vitest` tests will need migration or removal over time
- some current UI-oriented tests may need to be re-expressed as Storybook, Chromatic, Jest, or Playwright coverage
- the current baseline and the target model will differ for a while during migration

## Migration Posture
This decision does not require a big-bang rewrite.

Migration should be incremental:

1. keep documenting the current baseline separately from the target model
2. use Jest for new unit tests
3. stop adding new `vitest` coverage
4. migrate or retire existing `vitest` tests in small batches
5. introduce Storybook/Chromatic and Playwright deliberately, not implicitly

Until migration is complete, treat:

- [docs/workflows/testing-baseline.md](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/workflows/testing-baseline.md) as the description of current execution reality
- this ADR as the description of the intended future testing model
