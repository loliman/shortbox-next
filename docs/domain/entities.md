# Domain Entity Reference

## Purpose

This document complements [docs/domain/overview.md](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/domain/overview.md).

The overview explains the system at a high level: scopes, core relationships, browsing, and major domain rules.
This file is the implementation-facing reference for the most important entities. It is intended to help humans and
coding agents make safe changes to read logic, write logic, filters, routes, and editor flows without guessing about
ownership, scope, or invariants.

Use this document together with:
- [AGENTS.md](/Users/christian.riese/Documents/shortbox/shortbox-next/AGENTS.md)
- [docs/architecture/overview.md](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/architecture/overview.md)
- [docs/architecture/module-boundaries.md](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/architecture/module-boundaries.md)

## How To Read This File

For each entity:
- "Scope" tells you whether the entity belongs to `de`, `us`, or is shared across both scopes.
- "Relationships" focuses on the links most likely to matter in application logic.
- "Invariants" calls out rules that should remain stable during refactors or new feature work.
- "Avoid assuming" lists mistakes that commonly produce incorrect implementations.

## Entity Reference

### Publisher

What it represents:
- A publishing organization at the top of the publication hierarchy.

Scope:
- Belongs to exactly one domain scope.
- In practice, `Publisher.original = true` means `us`, and `Publisher.original = false` means `de`.

Relationships:
- A Publisher has many Series.
- Scope flows downward from Publisher to Series to Issue to Story.

Important invariants:
- `de` and `us` are domain scopes, not language locales.
- A Publisher does not become cross-scope just because its content is related to content in the other scope.
- Publisher scope is the basis for downstream publication scope.

Avoid assuming:
- Do not treat `original` as a translation flag or UI locale setting.
- Do not relate `de` and `us` publishers by name alone.
- Do not infer that similarly named publishers across scopes are interchangeable entities.

### Series

What it represents:
- A publication line owned by one Publisher.

Scope:
- Inherits its scope from its Publisher.

Relationships:
- A Series belongs to one Publisher.
- A Series has many Issues.

Important invariants:
- Series identity depends on title, start year, volume, and publisher context.
- Volume is required.
- Multiple series with the same title are distinguished by volume and publisher.

Avoid assuming:
- Do not treat title alone as a unique key.
- Do not treat volume as optional.
- Do not move series-level behavior into Issue or Publisher logic without a clear domain reason.

### Issue

What it represents:
- A concrete publication within a Series.

Scope:
- Inherits its scope from its Series and Publisher.

Relationships:
- An Issue belongs to one Series.
- An Issue can have many Stories.
- An Issue can have many Arcs through `IssueArc`.
- An Issue can have many issue-level Individuals through `IssueIndividual`.
- An Issue can have one or more Covers.
- Change requests in the current repository flow are attached to Issues.

Important invariants:
- Issue number is a string, not an integer.
- An Issue is identified within a Series by number, format, and optionally variant.
- An Issue may have zero stories.
- Detail and navigation logic may group multiple issue records with the same number as one issue plus variants.

Avoid assuming:
- Do not parse issue numbers as numeric IDs or sortable integers only.
- Do not assume one issue number maps to one database row.
- Do not assume every issue has its own independent displayed title and story list in the UI.

### Variant Handling

What it represents:
- A variant is not a separate entity type. It is an Issue record with the same number as another issue but with a
  different `format` and/or `variant` value.

Scope:
- Same scope rules as Issue.

Relationships:
- Variants are grouped with other Issue rows that share the same number within a Series.
- One grouped issue is treated as the main issue for presentation purposes.

Important invariants:
- Variant handling is partly a presentation concern layered on top of Issue records.
- Main issue priority is documented as:
  `Softcover > Hardcover > Heft > other > variant (alphanumerical)`.
- Title and story inheritance for variants exists in the UI/read layer only.
- Variant inheritance is not persisted as shared database state.
- A variant can exist without another issue row for the same number; in that case it becomes the effective main issue.

Avoid assuming:
- Do not model variants as a separate domain table or entity concept in new logic.
- Do not persist inherited title or stories back as if they were canonical shared values.
- Do not assume the row being rendered owns the displayed stories.
- Do not assume all variant rows are secondary; sometimes the only row is effectively the main issue.

### Story

What it represents:
- A content unit contained in an Issue.

Scope:
- Belongs to the same scope as its Issue.
- Stories are scope-specific even when they describe related content across `de` and `us`.

Relationships:
- A Story belongs to exactly one Issue.
- A `de` Story can reference one `us` parent Story.
- A Story can reference another Story as a reprint source.
- A Story can have many child Stories through the parent/child relation.
- A Story can link to many Individuals and Appearances.

Important invariants:
- Cross-scope publication relationships are modeled primarily at Story level, not by sharing Issues.
- A `de` Story with no parent is treated as exclusive content in current read/filter logic.
- Stories can drive related-publication views across scopes.
- Story flags such as `collected`, `collectedMultipleTimes`, `onlyTb`, and related print indicators are domain data,
  not UI-only decorations.
- The `collected` flag does not mean the current user owns the story.

Avoid assuming:
- Do not assume a `de` Story and its `us` parent are the same record with translated fields.
- Do not assume every `de` Story must have a parent; exclusive stories exist.
- Do not implement cross-scope linking by directly sharing Issue or Series records.
- Do not collapse reprint relationships and parent/child relationships into one concept.

### Individual

What it represents:
- A person involved in creating publication content.

Scope:
- Global and shared across both `de` and `us`.

Relationships:
- Linked to Stories through `StoryIndividual`.
- Linked to Issues through `IssueIndividual`.
- Linked to Covers through `CoverIndividual`.
- Roles are typed, for example `WRITER`, `PENCILER`, `EDITOR`, or `ARTIST`.

Important invariants:
- Individuals are not duplicated per scope.
- `TRANSLATOR` is a story-level role used only in the `de` context.
- `de` story presentation can combine inherited creator data from a `us` parent Story with `de`-specific roles such as
  `TRANSLATOR`.

Avoid assuming:
- Do not create scope-specific copies of the same person.
- Do not assume all roles apply at all levels.
- Do not move translator logic to issue-level or cover-level relationships.
- Do not assume creator display for a `de` story comes only from direct story links.

### Appearance

What it represents:
- A character, object, location, or concept appearing in a Story.

Scope:
- Global and shared across both `de` and `us`.

Relationships:
- Linked to Stories through `StoryAppearance`.
- Each link has its own role metadata, for example cameo or first appearance.

Important invariants:
- Appearances are shared reference entities, not duplicated per scope.
- `de` story presentation and matching may inherit appearances from a `us` parent Story.

Avoid assuming:
- Do not attach appearances directly to Issues or Series.
- Do not duplicate the same appearance per scope.
- Do not ignore link-level role information when implementing appearance-driven features.

### Arc

What it represents:
- A named story arc or event.

Scope:
- Global and shared across both `de` and `us`.

Relationships:
- Linked directly to Issues through `IssueArc`.
- Arc links are issue-level, not story-level.

Important invariants:
- Arc association lives on Issues.
- An Arc has a `type` field that can distinguish different kinds of arc usage.
- Arc behavior in some reads differs by scope because `de` issue views can surface related context through story parents.

Avoid assuming:
- Do not model Arcs as Story-owned entities.
- Do not duplicate Arcs per scope.
- Do not assume arc behavior is identical in every filter or detail read without checking the relevant read/service code.

### Cover

What it represents:
- A cover image or cover record attached to one Issue.

Scope:
- Belongs to the same scope as its Issue.

Relationships:
- A Cover belongs to exactly one Issue.
- Cover artists are linked through `CoverIndividual`.
- The schema also contains an optional parent/child relation between Covers.

Important invariants:
- Covers are issue-specific and are not shared across issues.
- Cover contributors are modeled separately from story or issue contributors.
- Repository documentation clearly grounds issue ownership, but cover parent/child semantics are less explicitly
  documented than story parent/child semantics.

Avoid assuming:
- Do not treat Covers as global shared assets reused across unrelated Issues.
- Do not merge cover-artist logic into story-creator logic.
- Do not invent semantics for cover parent/child relations without checking the affected code path.

### Change Request

What it represents:
- A stored editorial change proposal that can be reviewed before being applied.

Scope:
- Not a catalog-scope entity like `de` or `us`.
- It belongs to the editorial workflow rather than the publication hierarchy.

Relationships:
- In the current repository flow, change requests are attached to an Issue by `fkIssue`.
- The stored payload is JSON and contains issue data plus a proposed patch-like item payload.
- Accepting a change request applies the edit and then removes the change request entry.

Important invariants:
- Change requests are part of the restricted editing workflow.
- The repository currently documents issue-oriented change request handling much more clearly than series- or
  publisher-oriented change requests.
- Change requests should be treated as reviewable input, not canonical catalog state.

Avoid assuming:
- Do not treat a change request as already-applied content.
- Do not assume the JSON payload shape is a general domain contract for external consumers.
- Do not broaden change request semantics beyond the current issue-focused flow unless the implementation requires it
  and the behavior is documented first.

## Cross-Scope Relationships And Inheritance

Shortbox relates `de` and `us` primarily through Story-level relationships.

Practical rules:
- Publisher, Series, Issue, and Story records belong to one scope only.
- Shared entities such as Individual, Appearance, and Arc can be linked from either scope.
- A `de` Story can point to a `us` parent Story.
- A `us` Story can have multiple `de` child Stories.
- Reprint relationships are separate from parent/child localization relationships.

Inheritance behavior to preserve:
- Variant title/story inheritance is presentation-layer behavior for grouped Issues.
- `de` story views may inherit or supplement creator data from the `us` parent Story.
- `de` story views may inherit appearance data from the `us` parent Story.
- Cross-scope related-publication views should be derived from Story relationships, not from shared Issue identity.

Implementation caution:
- When changing read logic, verify whether the displayed data is owned by the current entity or inherited for display.
- When changing write logic, avoid persisting presentation-layer inheritance as if it were canonical database state.

## Rules Agents Must Not Assume

- `de` and `us` are not language locales.
- A variant is not a separate entity type.
- Issue number is not a numeric field in domain logic.
- Shared entities are not duplicated per scope.
- Story parent/child links and reprint links are different relationships.
- A displayed title, story list, creator list, or appearance list may include inherited presentation data.
- Change request payload shape should be treated as workflow data, not as a stable public domain model.

## Known Documentation Gaps

These areas are visible in the schema or codebase but are not yet fully documented at domain level:
- cover parent/child semantics
- the intended business meaning of some Story flags beyond the names used in filters and read models
- whether series- and publisher-type change requests are planned domain behavior or legacy/schema residue

If future work depends on one of these areas, document the intended behavior before extending product logic.
