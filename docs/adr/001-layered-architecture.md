# ADR 001: Layered Architecture

## Status
Accepted

## Context
The codebase is a Next.js application with growing domain complexity, background jobs, filter logic, SEO routing, and admin/editor workflows.

Business logic had started to spread across UI components, route handlers, util files, and legacy areas. This makes the system harder to maintain for both humans and AI coding agents.

## Decision
The project uses a pragmatic layered architecture:

- `app/` = Next.js entry layer
- `src/components/` = presentation layer
- `src/services/` = business logic layer
- `src/lib/` = infrastructure / technical layer
- `src/util/` = small pure helpers
- `src/core/` = legacy, no new code

General dependency direction:

- `app/` may use `src/components/`, `src/services/`, `src/lib/`
- `src/components/` may use selected service/lib helpers where already established
- `src/services/` may use `src/lib/`, `src/util/`, `src/types/`
- `src/lib/` may use `src/util/`, `src/types/`
- `src/util/` must not import higher layers

## Consequences
### Positive
- clearer placement rules
- better support for AI coding agents
- less architectural drift
- easier incremental refactoring

### Negative
- some legacy modules no longer match the target model
- migration will happen incrementally, not in one rewrite