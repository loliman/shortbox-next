# Jest Component Testing Policy

This document defines how component tests should be written in this repository.

Use it together with:

- [Testing baseline](./testing-baseline.md) for the current runner and CI reality
- [Testing target picture](./testing-target-picture.md) for the full multi-layer target model
- [CI and dependency automation](./ci-and-dependency-automation.md) for pipeline ownership and SonarCloud context

## Purpose

The goal of Jest component tests in this repository is not to generate coverage mechanically.

The goal is:

- to make component behavior explicit
- to make future changes fail fast when observable behavior breaks
- to support high coverage as a consequence of meaningful test design
- to keep coverage credible enough that SonarCloud signals are worth trusting

Tests should be written as if the component had been developed test-first:

- start from the public behavior
- describe the expected outcome
- prove the important branches
- avoid coupling the test to incidental implementation details

## Primary Standard

A good Jest component test in this repository protects a component contract.

That contract is the combination of:

- which state is rendered for a given input
- which actions are available or unavailable
- which callbacks fire
- which user-visible semantics change
- which URLs, labels, or status indicators are exposed

The test should verify the component from the outside.

Preferred shape:

1. render the component with realistic inputs
2. interact with it the way a user or caller would
3. assert visible or externally observable behavior

Avoid tests that primarily prove how the component is implemented internally.

## What Jest Should Cover Well

Jest is the preferred tool for component tests when the behavior under test is:

- deterministic
- local to one component or a very small component cluster
- expressible without real route transitions or seeded database state
- valuable as regression protection for future agent-driven refactors

High-value component test targets include:

- filter inputs and toggles
- conditional rendering with domain meaning
- issue preview and card presentation semantics
- empty, loading, disabled, and selected states
- callback payload correctness
- URL construction passed to links or actions
- regression cases for previously broken state combinations

## What Jest Should Not Own

Do not force the following into Jest just to raise coverage:

- real route-to-route navigation
- search workflows across pages
- responsive app-shell behavior that depends on a real browser
- seeded data flows that are already better represented in CI-backed browser tests
- large editor workflows with heavy wiring and extensive mocks

Those risks belong in Playwright or other dedicated layers.

If a component can only be tested by mocking a large portion of the app, the test is usually in the wrong layer.

## Definition Of A Good Component Test

A component test is good when it is:

- behavior-first
- small enough to understand quickly
- deterministic
- resilient to internal refactors
- specific about why the component matters

As a rule of thumb, a good test answers:

- what user-visible promise does this component make?
- what branch or state would silently break during a refactor?
- what would a future agent be likely to change incorrectly?

## Query And Assertion Policy

Prefer semantic queries in this order:

- `getByRole`
- `getByLabelText`
- `getByText`
- `getByPlaceholderText`

Use `queryBy*` and `findBy*` when absence or async behavior is the real contract.

Use `data-testid` only when:

- there is no stable semantic handle
- the element is intentionally non-accessible but still contract-relevant
- introducing a test id is clearer than overfitting text assertions

Prefer assertions on:

- visible text
- roles and names
- disabled/enabled state
- checked/unchecked state
- callback arguments
- rendered link targets
- presence or absence of contract-relevant UI

Avoid assertions on:

- component instance details
- implementation-specific class names
- deep DOM structure that users do not observe
- library internals

## Mocking Policy

Mock only at clear boundaries.

Reasonable boundaries to mock:

- route hooks
- API calls
- large app-wide providers
- isolated infrastructure helpers that are not the subject of the test

Do not mock:

- internal component helpers just to make assertions easier
- React behavior
- broad swaths of the component tree unless the test is explicitly a boundary test

If the setup is dominated by mocks rather than intent, the test likely does not belong in Jest.

## Test Design Rules

Each test file should express a small contract surface, not an accidental inventory of render snapshots.

Prefer:

- one clear describe block per component or behavior cluster
- descriptive `should_when_then` test names
- realistic props over synthetic impossible shapes
- regression tests for known bug combinations

Avoid:

- giant omnibus test files
- snapshot-heavy testing as the primary safety net
- repeating the same assertion across minor markup variations
- mount-only smoke tests without product meaning

## Coverage Philosophy

High coverage is desirable, but only when it reflects meaningful behavior.

In this repository, coverage should be used to reveal untested behavior, not to justify low-signal tests.

We want:

- strong statement and branch coverage on logic-heavy and state-heavy components
- broad practical coverage across important component states
- confidence that refactors by humans or agents break tests when behavior changes

We do not want:

- filler tests written only to satisfy a threshold
- snapshots used as a substitute for intent
- brittle assertions that discourage healthy refactoring

## SonarCloud Coverage Requirement

SonarCloud must be able to see Jest coverage for this strategy to matter operationally.

The intended setup is:

- Jest generates LCOV output
- CI runs the coverage command before SonarCloud scan
- SonarCloud reads the generated report

Required target wiring:

- Jest should emit `coverage/lcov.info`
- the repository command for that should be `npm run test:unit:coverage`
- SonarCloud should read that file through `sonar-project.properties`
- the SonarCloud workflow should generate coverage before the scan step

Without this, high-quality Jest tests still leave Sonar blind to actual repository coverage.

## Recommended Coverage Scope For Components

Prioritize coverage expansion in these areas:

- `src/components/filter/**`
- `src/components/details/**`
- `src/components/issue-preview/**`
- small selected-state and status-display components

Be more selective in:

- large shell components
- admin/editor workflow surfaces
- route-driven navigation components that are better validated in Playwright

## Decision Rule: Jest Or Not

Use this quick check before adding a new component test.

Choose Jest when:

- the component contract is local
- the behavior is observable without real browser navigation
- the setup stays small
- the assertions remain semantic

Do not choose Jest when:

- the real risk spans multiple routes
- the test needs seeded DB state to be meaningful
- the setup requires broad mocks to simulate the app
- the main concern is visual appearance rather than behavior

## Review Standard For New Tests

New Jest component tests should be reviewed against this bar:

- does the test protect a real product behavior?
- would the test fail for the kind of mistake an agent is likely to make?
- is the test understandable without reading the component implementation first?
- could the same risk be covered more cleanly in Playwright?
- is the gained coverage signal worth the maintenance cost?

If the answer is no, do not add the test just for coverage.
