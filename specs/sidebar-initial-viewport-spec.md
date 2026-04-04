# Sidebar Initial Viewport Spec

## Goal

Make the catalog sidebar open at the relevant selected context immediately instead of rendering from the top and revealing the target later via follow-up scroll behavior.

## Problem Statement

The current sidebar behavior still depends too heavily on post-render reveal logic:

- large publisher and issue branches often render an initial list state that is not yet centered on the selected path
- reveal scrolls run after rendering and data restoration have already started
- this creates visible jumping, delayed positioning, and main-thread pressure on large branches such as Marvel

The desired model is:

- the selected route determines the initial visible sidebar viewport
- scroll becomes a fallback correction, not the primary positioning mechanism

## Scope

- keep the catalog sidebar client-side
- make selected publisher / series / issue determine the initial rendered viewport for large branches
- reduce or eliminate dependency on post-render reveal scrolls for normal deep-link navigation
- keep changes within `src/components/nav-bar/` and adjacent presentation-shell code

## Non-Goals

- redesigning the sidebar UI
- changing route semantics, slug behavior, or metadata
- moving navigation behavior into `src/services/` or `src/lib/`
- reintroducing `main` skeletons or route loading placeholders

## User-Visible Behavior

- direct issue and series routes should open the sidebar already positioned near the selected context
- large lists should no longer appear to start at the top and then jump toward the selected item
- the selected series / issue should be visible as soon as the relevant branch becomes visible
- follow-up scrolling should be rare and only used as a fallback correction

## Architectural Placement

- initial viewport calculation is presentation logic and belongs in `src/components/nav-bar/`
- large-list range/window helpers remain pure helpers under `src/components/nav-bar/`
- scroll correction logic remains UI-only and must not contain business logic

## Desired Model

### 1. Selection Defines Initial Viewport

For large branches:

- publisher -> series lists should initially render a window centered on the selected series
- series -> issue lists should initially render a window centered on the selected issue

This means the initial viewport is derived from the selection, not from the top of the list.

### 2. Windowing Is Range-Based

Large-list rendering should use explicit range state:

- `windowStart`
- `windowEnd`
- optional anchor/target alignment metadata

The system should render:

- top spacer
- visible window around the selected target
- bottom spacer

instead of rendering from index `0` to some visible count.

### 3. Reveal Scroll Is Fallback Only

If the selected target is already inside the initial viewport, no active reveal scroll should be required.

Fallback scrolling is acceptable only when:

- browser layout differs unexpectedly
- a branch becomes visible later than expected
- user-triggered “jump to selection” explicitly requests it

### 4. Progressive Restoration Happens After Initial Positioning

Previously expanded non-selected branches may continue restoring later, but only after the selected path has already been positioned correctly.

Initial positioning must not depend on unrelated restoration work.

## Risks

- if selected-path indexing is wrong, the initial viewport can be centered around the wrong item
- if spacers or row-height assumptions are inaccurate, the initial visual position can drift
- if fallback reveal logic is not downgraded carefully, it can still fight the initial viewport model

## Acceptance Criteria

- the selected series is already within the initial visible viewport for large publisher branches
- the selected issue is already within the initial visible viewport for large issue branches
- deep-link navigation no longer relies primarily on post-render scroll reveals
- large-branch initialization feels calmer and less jumpy
- `npm run build` succeeds
- `npm run test:a11y:pa11y` continues to pass
