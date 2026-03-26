# Shortbox Domain Overview

## 1. System Purpose

Shortbox is a publication database for comic books that relates German comic publications to their original
(in the following "US") counterparts.

It catalogs publishers, series, issues, and variants – exclusively for Marvel publications,
covering both German publications and US original publications.

Users can browse the catalog, filter by a wide range of attributes, and view
detailed publication data including stories, creators, characters, story arcs, and covers.

One editor maintains the data through a restricted editing interface. Users can submit change requests for issues,
which are reviewed by the editor before being applied. The editor can log in via a login form.

The main purpose of Shortbox is to model and navigate publication relationships between US original material and
German publications that reprint, translate, or otherwise republish that material.

---

## 2. Domain Contexts: `de` and `us`

Shortbox manages two distinct publication scopes:

**`de` – German publications**  
Published by German publishers (e.g. Panini, BSV, Hachette).  
These are German-market publications of mostly US comic material.  
They are identified by `Publisher.original = false` in the database.

**`us` – US original publications**  
Published by US publishers (e.g. Marvel Comics).  
These are the original US publications.  
They are identified by `Publisher.original = true` in the database.

`de` and `us` are **domain scopes**, not language settings.  
They are not interchangeable and they are not i18n locales.

A story in a `de` issue and the same story in a `us` issue are related but separate publications.
The two scopes share the same entity types (Publisher, Series, Issue, etc.) but contain different publication data.

There are also stories that are exclusive to German publications. These are marked as **exclusive**,
which means they have no parent `us` story.

---

## 3. Core Domain Model

### 3.1 Publication Hierarchy

The central hierarchy is:

```
Publisher → Series → Issue → Variant
```

- A **Publisher** belongs to either the `de` or `us` scope.
- A **Series** belongs to one Publisher and is identified by its title, start year, and volume number.
  Volume is required. Multiple series with the same title are distinguished by volume and publisher.
- An **Issue** belongs to a Series. It is identified by its number, format, and optionally a variant name.
- A **Variant** is **not a separate entity**. It is modeled as an Issue with the same number
  but a different `format` and/or `variant` value.

**Main issue determination:**  
If multiple issues with the same number exist, the main issue priority is:
`Softcover > Hardcover > Heft > other > variant (alphanumerical)`.

**Important UI rule:**  
Variants inherit **title and stories from their main issue in the UI only**.  
This inheritance is **not persisted in the database**. In the editor, titles and stories can be edited for variants,
but these changes must not affect other issues and must not be treated as inherited data in the database layer.
The inheritance is a presentation/UI behavior only.

In rare cases, a variant may exist without another issue with the same number.
In that case, that issue is treated as the main issue.

---

### 3.2 Stories

A **Story** is a content unit published within an Issue.  
An Issue can contain multiple stories or no stories.

Stories have relationships:

- **Parent/child:** A `de` story can reference a `us` story as its parent,
  expressing that the German story is a reprint or localization of the US original.
- **Reprints:** A `us` story can reference another story as its reprint source (`fkReprint`).
- **Collected:** A story tracks whether it has been collected in a trade paperback or omnibus.

Stories always belong to exactly one Issue.

---

### 3.3 Individuals (Creators)

An **Individual** is a person involved in the creation of a comic.

Individuals are linked to stories, issues, and covers via typed roles:

- Story roles: `WRITER`, `PENCILER`, `INKER`, `COLORIST`, `LETTERER`, `TRANSLATOR`, etc.
- Issue roles: `EDITOR`
- Cover roles: `ARTIST`

The `TRANSLATOR` role exists only in the `de` context and is attached at story level.

`de` stories inherit individuals from their `us` parent story (if a parent exists),
in addition to German-specific roles like `TRANSLATOR`.

Individuals exist once globally and can be linked to both `de` and `us` publications.

---

### 3.4 Appearances

An **Appearance** represents a character, object, location, or concept
that appears in a story.

Appearances are linked to stories via `StoryAppearance`.
Each link carries a role (e.g. first appearance, cameo).

`de` stories inherit appearances from their `us` parent story if available.

Appearances exist once globally and can be linked to both `de` and `us` stories.

---

### 3.5 Story Arcs

An **Arc** is a named story arc or event.

Arcs are linked directly to Issues (not to Stories) via `IssueArc`.
An Arc has a `type` field (e.g. to distinguish reading order arcs from event arcs).

Arcs exist once globally and can be linked to both `de` and `us` issues.

---

### 3.6 Covers

A **Cover** is a cover image linked to exactly one Issue.

Individuals (cover artists) are linked to covers via `CoverIndividual`.

Covers are always issue-specific and are not shared across issues.

---

## 4. Cross-Scope Relationships

The main purpose of Shortbox is to relate publications across the `us` and `de` scopes.

Key relationships:

- A `de` story can reference a `us` story as its parent (reprint/localization relationship).
- A `us` story can have multiple `de` story children.
- Stories can reference other stories as reprints (`fkReprint`).
- Individuals, Appearances, Genres, and Arcs are shared across both scopes.
- When viewing an Issue in one scope, the UI can show related publications in the other scope via story relationships.

Cross-scope relationships are central to the domain and must be preserved when modifying story logic.

---

## 5. Entity Ownership and Scope

- Publisher, Series, Issue, and Variant belong to exactly one scope (`de` or `us`).
- Stories belong to exactly one Issue and therefore one scope.
- Individuals, Appearances, Genres, and Arcs are global entities shared across both scopes.
- Cross-scope relationships are implemented via Story parent/reprint relationships, not by sharing Issues.

---

## 6. Catalog Browsing and Filters

Users navigate the catalog via a hierarchical sidebar (Publisher → Series → Issue)
and via a filter system that supports:

- Format, publisher, series, issue number, release date
- Genre, story arc, character appearance, creator (individual)
- Collection status flags (collected, not collected, etc.)
- Print-type flags (first print, reprint, exclusive, etc.)

Filter state is serialized as a JSON string in the `?filter=` query parameter.

Route-based filter landing pages exist for persons, arcs, appearances, and genres.
These pages activate the filter system for a specific entity without requiring query parameters.

Users can switch between `de` and `us` contexts while browsing.
Switching the context resets the active filter because the scopes represent different publication datasets.

---

## 7. Editorial Workflow

Editors create, edit, and copy issues, series, and publishers through a restricted interface.

Changes can be submitted as change requests, which are reviewed before being applied.

Background worker tasks handle data maintenance, for example:
- rebuilding the search index
- updating story filter flags
- syncing data from external sources

---

## 8. Important Domain Rules and Constraints (What You Must Not Assume)

- **`de` is not German language.** It is the German publication market scope.
- **`us` is not English language.** It is the US publication scope.
- **A variant is not a separate entity in the database.**
- **Variant inheritance (title, stories) exists only in the UI layer, not in the database model.**
- **Volume is not optional.** Every Series has a volume.
- **Issue number is a string, not an integer.**
  Values like `½`, `0`, `-1`, `1/2`, `1A`, or Roman numerals are valid.
- **Stories belong to Issues but can reference stories across scopes.**
- **Individuals exist once globally.**
- **Arcs exist once globally.**
- **Appearances exist once globally.**
- **The `collected` flag on Story does not mean the user owns it.**
  It means the story has been collected in any German publication.