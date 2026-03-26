# docs/architecture/overview.md

# Architecture Overview

## Goal
This project uses a pragmatic layered architecture for a Next.js application with non-trivial business logic.

The goal is to keep:
- framework entry points thin
- business logic explicit
- technical concerns separate from domain behavior
- repository structure understandable for both humans and coding agents

## High-Level Structure

### Entry Layer
`app/`

This is the Next.js-facing layer:
- pages
- layouts
- route handlers
- server-side entry orchestration
- runtime/session/theme/request integration

This layer should stay thin and delegate business logic.

### Presentation Layer
`src/components/`

This layer contains:
- UI components
- page shells
- editor composition
- view-specific helpers

It is responsible for presentation, not business rules.

### Business Layer
`src/services/`

This layer contains:
- business logic
- feature workflows
- use cases
- domain-specific coordination

This is where the application's "fachliche Magie" belongs.

### Technical Layer
`src/lib/`

This layer contains:
- infrastructure-oriented code
- Prisma/database integration
- read/write access helpers
- routing/metadata helpers
- technical adapters

This layer supports the application technically, but should not become the main home of business rules.

### Utility Layer
`src/util/`

This layer contains:
- small generic helpers
- mappers
- formatters
- utility functions without architectural ownership

This is not a business layer.

### Background Processing
`src/worker/`

This layer contains:
- async task orchestration
- background jobs
- scheduled or deferred processing

Worker tasks should call services for business logic where possible.

## Architectural Direction
The intended dependency direction is:

- `app/` depends on `src/components/`, `src/services/`, and `src/lib/`
- `src/components/` may use presentation helpers and call into business-facing APIs/actions, but should not contain business logic itself
- `src/services/` may use `src/lib/` and `src/util/`
- `src/lib/` may use lower-level technical modules such as Prisma
- `src/util/` should remain lightweight and broadly reusable

## Notes on Legacy Structure
`src/core/` exists historically but is no longer a preferred destination for new code.

When modifying legacy code, prefer to move responsibilities gradually toward:
- `src/services/` for business logic
- `src/lib/` for technical/infrastructure logic
- `src/util/` for small generic helpers

## Refactoring Strategy
This project does not use a big-bang architecture rewrite.

Instead:
- architectural rules are documented first
- new code follows the new rules
- existing code is improved incrementally when touched

This keeps the system stable while steadily improving structure.