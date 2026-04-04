# AI Feature Development Workflow

## Goal
Use AI coding agents in a controlled, repeatable way for feature delivery.

## Standard Artifacts

Non-trivial feature work should create and pair two documents before product code changes:

- a spec in `specs/`
- a plan in `plans/`

Use the repository templates:

- use an existing spec in `specs/` as the closest template
- use the paired plan in `plans/` as the closest template

## Naming Convention

Specs and plans should use the same feature stem so humans and agents can pair them quickly.

Pattern:
- `specs/<feature-stem>-spec.md`
- `plans/<feature-stem>-plan.md`

Example:
- `specs/creator-bibliography-spec.md`
- `plans/creator-bibliography-plan.md`

Rules:
- use lowercase kebab-case
- describe the feature, not the ticket number
- keep one plan paired to one active spec
- if a spec is replaced, supersede the paired plan as well

## Workflow

### 1. Specification
Create a feature spec in `specs/` using the closest existing spec as a template.

Example:
- `specs/creator-bibliography-spec.md`

The spec should describe:
- goal
- scope
- non-goals
- user-visible behavior
- affected routes/pages
- business rules
- architectural placement expectations
- risks
- acceptance criteria

The spec is the source of truth for:
- what problem is being solved
- what is intentionally out of scope
- which domain rules must remain stable
- which architectural boundaries the implementation must respect

### 2. Implementation Plan
Create a plan in `plans/` using the closest existing plan as a template.

Example:
- `plans/creator-bibliography-plan.md`

The plan should contain:
- proposed file changes
- architectural layer placement
- implementation steps
- test plan
- rollout order

The plan should explicitly reference its spec and translate it into:
- expected file-level changes
- layer ownership
- verification steps
- risk mitigation

### 3. Implementation
The coding agent implements the feature in small steps.

Rules:
- keep pages thin
- place business logic in `src/services/`
- place Prisma access in `src/lib/`
- avoid unrelated refactoring

### 4. Tests
Add or update:
- unit tests for pure functions
- regression tests where legacy behavior must stay stable
- parity tests for normalization/migration changes

Use the current repository testing baseline in:
- `docs/workflows/testing-baseline.md`

The plan should name verification commands that are expected to fit the current repository testing baseline.

At minimum, the implementation should verify the commands named in the plan:
- `npm run lint`
- `npm test`

### 5. Review
Review against:
- `AGENTS.md`
- ADRs
- architectural boundaries
- tests
- SEO/canonical rules
- [High-risk hotspots](../architecture/high-risk-hotspots.md) when legacy write or normalization paths are touched

## Agent Roles
A single agent may be used in different roles sequentially:

- Architect
- Implementer
- Test Engineer
- Refactorer

## Preferred Change Style
- small safe steps
- extraction before rewriting
- stable behavior
- explicit documentation

## Minimum Delivery Sequence

For non-trivial work, prefer this order:

1. Write or update the spec.
2. Write or update the paired plan.
3. Implement in small steps.
4. Run the planned verification.
5. Review against the spec, plan, and architecture rules.
