# ADR 004: Testing Target Model

## Status
Accepted

## Context
The repository currently has a mixed testing landscape:

- Jest is the current official command via `npm test`
- some legacy UI-oriented tests historically assumed browser-style tooling that did not fit the safe baseline

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
- some current UI-oriented tests need to be removed rather than preserved
- some current UI-oriented tests need to be re-expressed as Storybook, Chromatic, Jest, or Playwright coverage
- the repository needs deliberate ownership boundaries to avoid recreating the old mixed state

## Migration Posture
Migration posture:

1. keep documenting the current baseline separately from the target model
2. use Jest for new unit tests
3. keep route and workflow confidence in Playwright instead of recreating it with mocked Jest tests
4. retire low-signal tests instead of preserving them as ignored debt
5. introduce Storybook/Chromatic deliberately, not implicitly

Until migration is complete, treat:

- [docs/workflows/testing-baseline.md](../workflows/testing-baseline.md) as the description of current execution reality
- this ADR as the description of the intended future testing model
