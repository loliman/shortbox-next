# Issue Create Auto Series Spec

## Goal
Allow the issue editor to create an issue for a not-yet-existing series by automatically creating the missing series from the selected publisher, series title, and volume.

## Scope
- detect when the selected series identity does not exist during issue save
- create the missing series automatically in the issue write path
- use the current year as `startyear`
- use `0` as `endyear`
- return enough server metadata so the editor can adjust the success snackbar

## Non-Goals
- changing series selection UX beyond the existing editor flow
- adding manual series fields to the issue editor
- changing canonical routing, metadata, or sitemap behavior
- implementing the second requested feature

## User-Visible Behavior
- users can save an issue even when the selected publisher, series title, and volume do not exist yet
- the missing series is created automatically before the issue is stored
- the success snackbar explicitly mentions that the series was created automatically

## Affected Areas
- `specs/`
- `plans/`
- `app/api/issues/route.ts`
- `src/lib/server/issues-write.ts`
- `src/components/restricted/editor/`

## Business Rules
- series identity is defined by `publisher + title + volume`
- auto-created series use the current calendar year as `startyear`
- auto-created series use `0` as `endyear`
- existing series continue to be reused

## Architectural Placement
- series lookup and creation remain in the issue write path under `src/lib/server/`
- API routes stay thin and only pass through validated request data and response metadata
- snackbar wording stays in the editor presentation layer

## Risks
- changing write-path return shapes can regress editor save behavior if the API contract is not updated consistently
- snackbar wording must stay clear for single saves, copy saves, and batch variant creation
- auto-created series metadata must not be inferred on the client without an explicit server signal

## Acceptance Criteria
- saving an issue with a missing `publisher + title + volume` creates the series automatically
- the auto-created series uses `startyear = current year` and `endyear = 0`
- the issue API returns explicit metadata when a series was auto-created
- the issue editor success snackbar mentions the automatic series creation only when it actually happened
- `npm run lint` and targeted Jest verification pass
