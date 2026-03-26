# docs/architecture/module-boundaries.md

# Module Boundaries

## Boundary Rules by Folder

| Folder | Responsibility | Should contain | Should not contain |
|---|---|---|---|
| `app/` | Next.js entry layer | pages, layouts, route handlers, entry orchestration | larger business logic, DB details, reusable domain workflows |
| `src/components/` | UI/presentation | components, shells, form composition, view-specific helpers | business rules, DB access, complex feature workflows |
| `src/services/` | business logic | use cases, domain rules, feature workflows, business coordination | framework plumbing, low-level DB wiring, generic helpers dump |
| `src/lib/` | technical/infrastructure | Prisma access, adapters, read/write helpers, routing/metadata helpers | primary business logic home |
| `src/util/` | generic helpers | small pure helpers, formatters, mappers | business workflows, infrastructure adapters |
| `src/worker/` | async orchestration | task registration, loaders, async execution | duplicated core business logic |
| `src/types/` | shared types | shared type definitions | implementation logic |
| `src/core/` | legacy area | existing legacy logic only | new code by default |

## Practical Placement Rules

### Put code in `src/services/` when:
- it contains business rules
- it coordinates a feature-specific workflow
- it decides domain behavior
- it connects multiple technical pieces to perform a use case

### Put code in `src/lib/` when:
- it talks to Prisma or the database
- it provides a technical adapter
- it supports routing, metadata, or framework integration
- it performs technical read/write support logic

### Put code in `src/util/` when:
- it is small
- it is generic
- it has no business ownership
- it can be reused without knowing the domain workflow

### Put code in `src/components/` when:
- it renders UI
- it composes UI elements
- it contains view-specific presentation behavior

### Keep `app/` thin:
- validate input
- call services/lib helpers
- return result
- avoid embedding larger business behavior directly in entry points

## Anti-Patterns

### Do not:
- put new business logic into `src/util/`
- put domain workflows into React components
- let route handlers grow into business service implementations
- use `src/lib/` as a catch-all for everything
- add new code to `src/core/` by default

## Migration Guidance
When touching older code:
1. keep the change scoped
2. avoid mass rewrites
3. move responsibilities only when there is a clear benefit
4. prefer boy-scout-rule improvements over structural churn

## Rule of Thumb
Ask this before adding code:

- Is this business logic? → `src/services/`
- Is this technical/infrastructure logic? → `src/lib/`
- Is this just a small helper? → `src/util/`
- Is this UI? → `src/components/`
- Is this just an entry point? → `app/`