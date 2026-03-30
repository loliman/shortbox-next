# Panini Preview Import Specification

## Document Metadata

- Feature name: Panini preview PDF import for queued issue creation
- Spec identifier: `spec-panini-preview-import-v1`
- Status: Draft
- Related plan: [`plans/panini-preview-import-plan.md`](/Users/christian/shortbox/shortbox-next/plans/panini-preview-import-plan.md)
- Related ADRs:
- Architecture decision required?: Yes
- Authors: Codex, Christian
- Last updated: 2026-03-30

## 1. Goal

Editors regularly create many `de` issues from Panini preview material, and the slowest part is manually transferring title, metadata, and story references into one issue editor after another. This feature should turn an uploaded Panini preview PDF into a queue of issue drafts that open in the existing issue editor with fields prefilled. The editor can then correct one draft, create it, skip it, and continue directly to the next draft without restarting the process each time.

## 2. Scope

List what is included in this feature.
Prefer concrete behavior and affected surfaces over implementation detail.

- A new admin-only entry point for uploading a Panini preview PDF.
- Server-side extraction of machine-readable text from uploaded preview PDFs.
- Parsing extracted preview text into a list of `de` issue drafts.
- Recognizing draft boundaries from preview-style product blocks, including title, descriptive copy, metadata line, and `Inhalt:` line when present.
- Prefilling the existing issue editor with parsed draft data for one draft at a time.
- A queued creation flow that supports `Erstellen und weiter` for the next draft in sequence.
- A queued creation flow that supports `Überspringen` for entries that should not be created.
- Prefilling story references from parsed `Inhalt:` values using the existing story-reference parsing approach.
- Supporting draft creation for main issues and simple variant entries when the preview text clearly exposes a variant code and product line.
- Keeping the import flow admin-only and separate from public change-request reporting.

## 3. Non-Goals

- OCR for scanned or image-only PDFs in the first version.
- Full automatic parsing of every Panini preview layout irregularity or damaged OCR output.
- Fully automatic creation of all parsed drafts without human review in the editor.
- Automatic image import from the preview PDF.
- Automatic detection and creation of new publishers or series that do not yet exist in Shortbox without editor confirmation.
- Support for non-Panini catalog layouts in the first version.

## 4. User-Visible Behavior

Describe the expected behavior from the user's perspective.
Focus on observable outcomes, not internal implementation.

- Entry points:
  - A new admin-only import entry point reachable from the editorial workflow.
  - The existing issue editor remains the place where the final correction and creation happens.
- Expected UI or API changes:
  - The admin can upload a Panini preview PDF.
  - The system extracts text server-side and parses it into persisted queue drafts.
  - The admin starts directly in a guided queue flow where the first draft opens in the issue editor without a separate review list.
  - After saving a draft with `Erstellen und weiter`, the next draft opens automatically.
  - The flow supports `Überspringen` and `Abbrechen`.
  - The flow indicates draft position, for example `3 von 12`.
  - If an import queue is already active, the admin sees a clear resume/discard hint before starting another batch.
- Empty, loading, error, and not-found states:
  - Empty state shows an upload prompt and a short instruction.
  - PDFs without extractable text show a clear failure message and do not create a queue.
  - Unparseable text shows draft-level and/or block-level parse errors without crashing the flow.
  - If no valid drafts can be produced, the user stays on the import screen with clear feedback.
  - If a referenced series cannot be matched confidently, the draft still opens, but the missing data is visibly unresolved.
- SEO or canonical URL impact:
  - None expected. This is an admin-only workflow and must not alter public canonical routing.

## 5. Domain and Business Rules

Capture the domain rules that must be preserved or introduced.

- Existing rules that apply:
  - `de` and `us` remain domain scopes, not locales.
  - Issues are created through the existing editorial issue flow and current write path.
  - Story relationships remain story-level, not issue-level shortcuts.
  - Series identity still depends on title, volume, publisher, and existing issue creation rules.
  - Variants are still represented as issue rows, not a separate entity type.
- New rules introduced by this feature:
  - Uploaded preview PDFs are converted to extracted text server-side before parsing.
  - Parsed preview text produces draft data, not canonical issue data, until an editor saves it.
  - The first version targets `de` issue creation from Panini preview PDFs with machine-readable text only.
  - If a parsed product block includes an `Inhalt:` line, it should be converted into draft story references when possible.
  - If no volume is explicitly parsed from a referenced source series, story import defaults to `Vol. 1`, consistent with the current story quick-import behavior.
  - Queue progression is editor-driven; no draft should be persisted automatically just because it parsed successfully.
  - Preview parsing runs server-side in the first version.
  - PDF text extraction in V1 should use a runtime-compatible pure JavaScript approach in the Node server runtime, not external system binaries or OCR.
  - There is exactly one active import queue per admin user in V1.
  - Series matching in the first version is conservative: exact name matching only, with optional normalization limited to case, whitespace, and leading `The`.
  - Drafts with unresolved German series matches still open in the editor with incomplete data instead of blocking the queue before entry.
- Rules that must remain unchanged:
  - Public routes, issue detail behavior, and change-request flows must not change.
  - The import tool must not be available to non-admin users.
  - Existing editor validation and save semantics remain the source of truth.

Reference:
- [AGENTS.md](/Users/christian/shortbox/shortbox-next/AGENTS.md)
- [docs/domain/overview.md](/Users/christian/shortbox/shortbox-next/docs/domain/overview.md)
- [docs/domain/entities.md](/Users/christian/shortbox/shortbox-next/docs/domain/entities.md)
- Relevant ADRs in [docs/adr/](/Users/christian/shortbox/shortbox-next/docs/adr/)

## 6. Affected Routes and Pages

List all affected entry points, including route context.

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| New admin preview import page or modal entry | `admin` | Upload preview PDF, resume/discard active queue, start queue flow |
| Existing issue creation editor flow | `de`, `admin` | Accept prefilled preview draft data and expose `Erstellen und weiter` queue behavior |
| New import queue API route(s) | `api`, `admin` | Accept PDF upload, extract text, parse structured drafts, persist queue state, resume or discard active queue |
| Existing `/api/issues` | `api`, `admin` | Reused for final persistence, behavior should not fundamentally change |

## 7. Architectural Placement Expectations

State where the work belongs before implementation begins.

- Entry points to keep thin in `app/`:
  - New admin import page route should only load session/context and render the import feature.
  - Any new route handlers should validate input, call service/lib logic, and return structured output.
- UI or presentation changes expected in `src/components/`:
  - PDF upload input, active-queue notice, queue progress UI, and editor wrapper behavior.
  - Reuse existing issue editor surfaces instead of creating a second full editor.
- Business logic expected in `src/services/`:
  - Extracted preview text parsing into product blocks and normalized issue drafts.
  - Heuristics for mapping preview text sections into title, content references, metadata, and variant candidates.
  - Conservative series-title matching rules and draft normalization.
- Technical or Prisma work expected in `src/lib/`:
  - Existing issue creation path reuse.
  - PDF text extraction support for machine-readable PDFs.
  - Series lookup helpers used to enrich parsed drafts.
  - Server-side queue storage, queue reads, and queue mutation endpoint support.
- Pure helpers or shared types, if any:
  - Draft types, parser helper types, and pure normalization helpers.
- Existing modules or patterns to reuse:
  - [`src/components/restricted/editor/IssueEditor.tsx`](/Users/christian/shortbox/shortbox-next/src/components/restricted/editor/IssueEditor.tsx)
  - [`src/components/restricted/create/IssueCreate.tsx`](/Users/christian/shortbox/shortbox-next/src/components/restricted/create/IssueCreate.tsx)
  - [`src/components/restricted/editor/issue-sections/StoryBulkImport.tsx`](/Users/christian/shortbox/shortbox-next/src/components/restricted/editor/issue-sections/StoryBulkImport.tsx)
  - [`src/services/story-reference-parser.ts`](/Users/christian/shortbox/shortbox-next/src/services/story-reference-parser.ts)
  - Existing autocomplete and issue write paths

## 8. Risks and Edge Cases

Call out the cases most likely to cause regressions or ambiguity.

- Domain edge cases:
  - A preview block may represent a variant rather than a main issue.
  - `Inhalt:` references may include annuals, ranges, multiple source series, or OCR damage.
  - A preview entry may omit fields such as pages, format, release date, or price.
  - Preview titles and database series titles may differ slightly in punctuation or subtitles.
  - Variant entries may appear as separate product codes, limited editions, or repeated titles with variant-specific wording.
- Routing or slug edge cases:
  - Queue navigation must not accidentally send the user into copy/report flows.
  - Partial save failures must not lose the remaining draft queue.
- Legacy hotspots touched:
  - Existing issue editor submit flow currently assumes either normal save or copy flow.
  - Story parsing and story defaulting must remain compatible with current editor story behavior.
- Data integrity or migration concerns:
  - PDFs without usable text layers must fail cleanly instead of creating garbage drafts.
  - Draft parsing must not create partial DB rows before explicit editor submission.
  - Queue state must not duplicate issues silently if the user refreshes or replays the same batch.
  - Series matching must avoid silently assigning the wrong series; false negatives are preferred over false positives in V1.
- SEO or canonical risks:
  - None expected if the flow stays entirely in admin space.

## 9. Acceptance Criteria

Write concrete statements that can be verified during implementation and review.
Use statements that a reviewer or coding agent can check without interpretation.

- [ ] The admin can upload a Panini preview PDF and get a structured list of issue drafts when the PDF has extractable text.
- [ ] The first version supports `de` issue draft generation from uploaded PDFs without requiring OCR.
- [ ] V1 PDF extraction works without depending on external system binaries in the target runtime.
- [ ] Parsed drafts can prefill the existing issue editor one at a time.
- [ ] The editor supports a queue action equivalent to `Erstellen und weiter` for imported drafts.
- [ ] The editor supports `Überspringen` for imported drafts.
- [ ] Story references parsed from `Inhalt:` can prefill the existing story import/editor structures when the text is parseable.
- [ ] Non-admin users and change-request editors do not see or access the import flow.
- [ ] Active queue state survives reloads and can be resumed or discarded by the same admin user.
- [ ] Only one active queue per admin user is allowed in V1.
- [ ] Drafts with unresolved German series matches still open in the editor instead of blocking queue progression before edit.
- [ ] Architectural boundaries from `AGENTS.md` are respected.
- [ ] No product behavior outside the defined scope changes.
- [ ] Required admin routes and error states are handled correctly.
- [ ] Relevant parser, queue, and editor integration tests are identified.

## 10. Open Questions

Capture unresolved items that must be answered before implementation or review.

- Question: Should variant detection in the first version be limited to clearly separated preview entries such as variant-specific product codes, or should it also infer variants from surrounding text and repeated titles?
- Decision needed from: Product/domain
- Blocking or non-blocking: Non-blocking
