# AI Review Checklist

Use this checklist for non-trivial feature work, especially when reviewing AI-assisted changes.

## Review Checks

- [ ] The change stays in the right architectural layer.
- [ ] `app/` pages and route handlers remain thin.
- [ ] Business rules live in `src/services/`, not in components or utilities.
- [ ] The change respects the domain rules in `docs/domain/overview.md` and `docs/domain/entities.md`.
- [ ] The change does not introduce unrelated refactoring or scope creep.
- [ ] Tests or validation steps are added or updated for the changed behavior.
- [ ] SEO, canonical URL, and metadata behavior are correct where the change affects routes.
- [ ] Legacy hotspots are handled cautiously and regression risk is addressed.

## When To Escalate

Pause and add a spec or ADR review if the change:

- alters a documented architectural boundary
- changes a domain invariant
- introduces a new canonical route or SEO behavior
- touches a legacy hotspot with unclear behavior
