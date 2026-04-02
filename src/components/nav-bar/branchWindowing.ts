export const LARGE_BRANCH_ROW_THRESHOLD = 160;
export const LARGE_BRANCH_CHUNK_SIZE = 120;
export const LARGE_BRANCH_SELECTED_BUFFER = 24;
export const LARGE_BRANCH_OCCLUSION_THRESHOLD = 48;
export const NAV_LIST_TOP_PADDING = 4;
export const PUBLISHER_ROW_HEIGHT = 48;
export const SERIES_ROW_HEIGHT = 44;
export const ISSUE_ROW_HEIGHT = 36;

export type BranchWindowRange = {
  start: number;
  end: number;
};

export type InitialViewportSelection =
  | {
      publisherIndex: number;
    }
  | {
      publisherIndex: number;
      series: {
        totalCount: number;
        selectedIndex: number;
      };
    }
  | {
      publisherIndex: number;
      series: {
        totalCount: number;
        selectedIndex: number;
      };
      issue: {
        totalCount: number;
        selectedIndex: number;
      };
    };

export function shouldWindowBranch(totalCount: number) {
  return totalCount > LARGE_BRANCH_ROW_THRESHOLD;
}

export function getInitialWindowRowCount(totalCount: number, selectedIndex?: number | null) {
  if (totalCount <= 0) return 0;
  if (!shouldWindowBranch(totalCount)) return totalCount;

  const prioritizedCount =
    typeof selectedIndex === "number" && selectedIndex >= 0
      ? selectedIndex + 1 + LARGE_BRANCH_SELECTED_BUFFER
      : 0;

  return Math.min(totalCount, Math.max(LARGE_BRANCH_CHUNK_SIZE, prioritizedCount));
}

export function getNextWindowRowCount(currentCount: number, totalCount: number) {
  if (currentCount >= totalCount) return totalCount;
  return Math.min(totalCount, currentCount + LARGE_BRANCH_CHUNK_SIZE);
}

export function getInitialWindowRange(
  totalCount: number,
  selectedIndex?: number | null
): BranchWindowRange {
  if (totalCount <= 0) return { start: 0, end: 0 };
  if (!shouldWindowBranch(totalCount)) return { start: 0, end: totalCount };

  if (typeof selectedIndex !== "number" || selectedIndex < 0) {
    return {
      start: 0,
      end: Math.min(totalCount, LARGE_BRANCH_CHUNK_SIZE),
    };
  }

  const preferredWindowSize = LARGE_BRANCH_CHUNK_SIZE;
  const beforeCount = Math.max(
    LARGE_BRANCH_SELECTED_BUFFER,
    Math.floor((preferredWindowSize - 1) / 2)
  );
  const afterCount = Math.max(
    LARGE_BRANCH_SELECTED_BUFFER,
    preferredWindowSize - beforeCount - 1
  );
  let start = Math.max(0, selectedIndex - beforeCount);
  let end = Math.min(totalCount, selectedIndex + afterCount + 1);

  const deficit = preferredWindowSize - (end - start);
  if (deficit > 0) {
    const growBefore = Math.min(start, deficit);
    start -= growBefore;
    end = Math.min(totalCount, end + (deficit - growBefore));
  }

  const remainingDeficit = preferredWindowSize - (end - start);
  if (remainingDeficit > 0) {
    start = Math.max(0, start - remainingDeficit);
  }

  return { start, end };
}

export function getNextWindowRange(
  currentRange: BranchWindowRange,
  totalCount: number,
  selectedIndex?: number | null
): BranchWindowRange {
  if (currentRange.start <= 0 && currentRange.end >= totalCount) {
    return { start: 0, end: totalCount };
  }

  if (typeof selectedIndex !== "number" || selectedIndex < 0) {
    return {
      start: 0,
      end: Math.min(totalCount, currentRange.end + LARGE_BRANCH_CHUNK_SIZE),
    };
  }

  const growPerSide = Math.max(LARGE_BRANCH_SELECTED_BUFFER, Math.floor(LARGE_BRANCH_CHUNK_SIZE / 2));
  return {
    start: Math.max(0, currentRange.start - growPerSide),
    end: Math.min(totalCount, currentRange.end + growPerSide),
  };
}

export function getInitialViewportTargetOffset(selection: InitialViewportSelection) {
  let targetOffset = NAV_LIST_TOP_PADDING + selection.publisherIndex * PUBLISHER_ROW_HEIGHT;
  let targetRowHeight = PUBLISHER_ROW_HEIGHT;

  if (!("series" in selection)) {
    return { targetOffset, targetRowHeight };
  }

  const seriesRange = getInitialWindowRange(
    selection.series.totalCount,
    selection.series.selectedIndex
  );
  targetOffset +=
    PUBLISHER_ROW_HEIGHT +
    seriesRange.start * SERIES_ROW_HEIGHT +
    (selection.series.selectedIndex - seriesRange.start) * SERIES_ROW_HEIGHT;
  targetRowHeight = SERIES_ROW_HEIGHT;

  if (!("issue" in selection)) {
    return { targetOffset, targetRowHeight };
  }

  const issueRange = getInitialWindowRange(
    selection.issue.totalCount,
    selection.issue.selectedIndex
  );
  targetOffset +=
    SERIES_ROW_HEIGHT +
    issueRange.start * ISSUE_ROW_HEIGHT +
    (selection.issue.selectedIndex - issueRange.start) * ISSUE_ROW_HEIGHT;
  targetRowHeight = ISSUE_ROW_HEIGHT;

  return { targetOffset, targetRowHeight };
}

export function getInitialViewportScrollTop(
  selection: InitialViewportSelection,
  containerHeight: number
) {
  const { targetOffset, targetRowHeight } = getInitialViewportTargetOffset(selection);
  return Math.max(0, targetOffset - Math.max(0, (containerHeight - targetRowHeight) / 2));
}
