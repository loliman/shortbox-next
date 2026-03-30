# Panini Preview Import Implementation Plan

## Document Metadata

- Feature name: Panini preview PDF import for queued issue creation
- Plan identifier: `plan-panini-preview-import-v1`
- Status: Draft
- Related spec: [`specs/panini-preview-import-spec.md`](/Users/christian/shortbox/shortbox-next/specs/panini-preview-import-spec.md)
- Authors: Codex, Christian
- Last updated: 2026-03-30

## 1. Summary

The implementation should add an admin-only import flow that accepts a Panini preview PDF, extracts machine-readable text server-side, parses it into normalized draft issues, persists those drafts as an active queue, and drives the existing issue editor one draft at a time. The editor flow should stay familiar while gaining queue-specific actions such as `Erstellen und weiter`, `Überspringen`, and queue resume/discard behavior.

## 2. Scope Check

- In scope:
  - Admin-only import entry point for preview PDF upload
  - Server-side PDF text extraction for machine-readable PDFs
  - Server-side parsing of extracted preview text into normalized draft issues
  - Server-side persisted queue state that survives reloads
  - Exactly one active queue per admin user
  - Queue-driven issue editor flow for `de` issues
  - Conservative series matching and story-reference prefilling
- Out of scope:
  - OCR for image-only PDFs
  - Fully automatic issue creation without editor confirmation
  - Fuzzy series matching beyond exact matching with small normalization
  - Non-Panini catalog import formats
- Assumptions carried from the spec:
  - No review list before entering the queue
  - Queue actions include `Erstellen und weiter`, `Überspringen`, and `Abbrechen`
  - Queue state is server-side and visible to admins as resumable work
  - V1 PDF extraction uses a pure JavaScript solution in the Node runtime instead of external binaries
  - Unresolved German series matches do not block entry into the editor

## 3. Proposed File Changes

| Path | Change type | Reason |
|---|---|---|
| `app/admin/...` | add | Add thin admin entry point for preview import |
| `app/api/...` | add | Add thin admin API routes for PDF upload, queue creation, resume, skip, and discard |
| `src/components/admin/...` | add/update | Import UI, active queue notice, queue wrapper around issue editor |
| `src/components/restricted/editor/IssueEditor.tsx` | update | Support queue-aware submit flow without duplicating the editor |
| `src/components/restricted/editor/issue-editor/*` | update | Surface queue progress and queue actions in the existing editor |
| `src/services/...` | add | Parse extracted preview text into normalized draft issue shapes |
| `src/lib/read/...` | add/update | Look up matching series and active queue state |
| `src/lib/server/...` | add | Extract PDF text and persist, update, skip, and discard import queues and queue drafts |
| `src/types/...` | add/update | Shared draft and queue state types |

## 4. Layer Placement

- `app/` responsibilities:
  - Render the admin import page
  - Expose thin admin route handlers for PDF upload and queue lifecycle operations
- `src/components/` responsibilities:
  - Render PDF upload input, active queue notice, queue progress, and queue-aware editor actions
  - Reuse the existing issue editor rather than introducing a second editor implementation
- `src/services/` responsibilities:
  - Parse extracted preview text into product blocks and normalized issue draft structures
  - Apply conservative title normalization and field extraction rules
- `src/lib/` responsibilities:
  - Read matching series and active queue state
  - Extract text from machine-readable PDFs
  - Persist queue records and draft records
  - Reuse the existing issue create path when a draft is confirmed
- `src/util/` or `src/types/` responsibilities:
  - Hold pure draft/queue types and small normalization helpers when they are not domain workflows
- Areas intentionally left unchanged:
  - Public issue routes and detail reads
  - Change-request reporting flow
  - Existing issue persistence semantics in `/api/issues`

## 5. Implementation Steps

1. Add shared draft and queue types plus a server-side parser service that turns extracted preview text into normalized draft issue data and parser diagnostics.
2. Add a server-side PDF text extraction path for machine-readable PDFs and define clear failure behavior for PDFs without usable text.
3. Add server-side queue persistence with one active queue per admin user plus admin API routes for uploading a PDF, creating a queue, reading the active queue, skipping a draft, and discarding a queue.
4. Add the admin import entry point and PDF upload UI that creates a queue and immediately routes into the first draft editor.
5. Extend the existing issue editor flow with queue context, progress display, and queue actions such as `Erstellen und weiter` and `Überspringen`.
6. Integrate conservative series matching and existing story-reference import behavior into parsed drafts so the editor opens with as much prefilled data as safely possible.
7. Add resume/discard handling so an admin with an active queue sees that state and can continue or abandon it.
8. Add focused tests for PDF extraction, parsing, queue state transitions, and editor queue integration, then validate the full flow end to end.

## 6. Test Plan

- Unit tests:
  - PDF extraction adapter tests for machine-readable PDFs
  - Preview text parser tests for title, metadata, `Inhalt:` extraction, and variant/product-code edge cases
  - Series matching normalization tests for exact matching plus optional `The` handling
  - Queue state transition tests for create, resume, skip, advance, and discard
- Regression tests:
  - PDF extraction failure path for PDFs without usable text
  - Existing issue editor save flow still works outside queue mode
  - Change-request editor still does not expose import-only actions
  - Story quick-import behavior still works as before
- Integration or route coverage, if any:
  - Admin API route tests for PDF upload and queue lifecycle endpoints
  - Queue-to-editor integration tests around `Erstellen und weiter`
- Lint command: `npm run lint`
- Jest command: `npm test -- --runInBand`

## 7. Validation and Rollout Order

1. Validate PDF text extraction and parser fixtures in isolated tests before wiring UI.
2. Validate queue state transitions and admin-only route protection.
3. Validate active-queue resume/discard behavior.
4. Validate queue-aware editor actions and save progression through multiple drafts.
5. Validate non-queue editor flows to ensure no regression in normal create/edit behavior.
6. Run full repo verification commands before review.

## 8. Risks and Mitigations

- Risk: Preview parsing will mis-split issue blocks when OCR/text extraction is noisy.
- Why it matters: A broken split poisons every downstream draft in the queue.
- Mitigation: Build parser fixtures from real preview samples and surface draft-level parse failures instead of silently inventing data.

- Risk: The chosen PDF text extraction approach may not work reliably in the deployment runtime.
- Why it matters: The upload flow depends on server-side text extraction before parsing can begin.
- Mitigation: Use a pure JavaScript extraction approach in the Node runtime, verify it in the target environment, and fail clearly when extraction is unavailable.

- Risk: One active queue per admin user may create friction if an admin starts a second import before finishing the first.
- Why it matters: The user could feel blocked by stale work-in-progress state.
- Mitigation: Make the active queue prominent, resumable, and discardable before allowing a replacement import.

- Risk: Conservative series matching will leave too many unresolved drafts.
- Why it matters: The tool becomes slower if too much manual correction remains.
- Mitigation: Prefer unresolved drafts over wrong matches in V1 and capture real misses for later matching improvements.

- Risk: Queue-aware editor changes could regress normal create, copy, or edit flows.
- Why it matters: The existing issue editor is a central editorial surface.
- Mitigation: Keep queue state additive, route it through explicit props/context, and cover normal editor mode with regression tests.

- Risk: Server-side queue persistence can leave stale active queues behind.
- Why it matters: Admins may get stuck with outdated queue notices or duplicate batches.
- Mitigation: Add explicit discard behavior, clear completed queues, and make active queue ownership/status visible in the admin UI.

## 9. Review Checklist

- [ ] File placement follows `AGENTS.md` and documented module boundaries.
- [ ] Pages and route handlers remain thin.
- [ ] No Prisma access is introduced outside `src/lib/`.
- [ ] No unrelated refactor is included.
- [ ] Tests and verification steps are identified before implementation starts.
