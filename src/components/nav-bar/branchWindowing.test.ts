import {
  getInitialWindowRange,
  getInitialViewportScrollTop,
  getInitialViewportTargetOffset,
  getInitialWindowRowCount,
  getNextWindowRange,
  getNextWindowRowCount,
  ISSUE_ROW_HEIGHT,
  LARGE_BRANCH_CHUNK_SIZE,
  LARGE_BRANCH_SELECTED_BUFFER,
  LARGE_BRANCH_ROW_THRESHOLD,
  PUBLISHER_ROW_HEIGHT,
  SERIES_ROW_HEIGHT,
  shouldWindowBranch,
} from "./branchWindowing";

describe("branchWindowing", () => {
  it("should_when_smallBranch_then_skipWindowing", () => {
    expect(shouldWindowBranch(LARGE_BRANCH_ROW_THRESHOLD)).toBe(false);
    expect(getInitialWindowRowCount(40, null)).toBe(40);
  });

  it("should_when_largeBranchWithoutSelection_then_startWithChunkSize", () => {
    expect(getInitialWindowRowCount(500, null)).toBe(LARGE_BRANCH_CHUNK_SIZE);
  });

  it("should_when_largeBranchWithSelection_then_prioritizeSelectedRange", () => {
    expect(getInitialWindowRowCount(500, 220)).toBe(221 + LARGE_BRANCH_SELECTED_BUFFER);
  });

  it("should_when_advancingWindow_then_stopAtTotalCount", () => {
    expect(getNextWindowRowCount(120, 500)).toBe(240);
    expect(getNextWindowRowCount(480, 500)).toBe(500);
    expect(getNextWindowRowCount(500, 500)).toBe(500);
  });

  it("should_when_largeBranchWithSelection_then_centerInitialWindowAroundSelection", () => {
    expect(getInitialWindowRange(500, 220)).toEqual({
      start: 161,
      end: 281,
    });
  });

  it("should_when_growingSelectedWindow_then_expandAroundSelectionInsteadOfFromTop", () => {
    expect(getNextWindowRange({ start: 161, end: 281 }, 500, 220)).toEqual({
      start: 101,
      end: 341,
    });
  });

  it("should_when_selectedIndexNearStart_then_clampInitialWindowToTop", () => {
    expect(getInitialWindowRange(500, 8)).toEqual({
      start: 0,
      end: LARGE_BRANCH_CHUNK_SIZE,
    });
  });

  it("should_when_selectedIndexNearEnd_then_clampInitialWindowToBottom", () => {
    expect(getInitialWindowRange(500, 492)).toEqual({
      start: 380,
      end: 500,
    });
  });

  it("should_when_issueSelectionProvided_then_deriveTargetOffsetFromSelectedWindows", () => {
    expect(
      getInitialViewportTargetOffset({
        publisherIndex: 3,
        series: {
          totalCount: 500,
          selectedIndex: 220,
        },
        issue: {
          totalCount: 300,
          selectedIndex: 150,
        },
      })
    ).toEqual({
      targetOffset:
        4 +
        3 * PUBLISHER_ROW_HEIGHT +
        PUBLISHER_ROW_HEIGHT +
        161 * SERIES_ROW_HEIGHT +
        59 * SERIES_ROW_HEIGHT +
        SERIES_ROW_HEIGHT +
        91 * ISSUE_ROW_HEIGHT +
        59 * ISSUE_ROW_HEIGHT,
      targetRowHeight: ISSUE_ROW_HEIGHT,
    });
  });

  it("should_when_containerHeightProvided_then_centerInitialViewportAroundTargetRow", () => {
    expect(
      getInitialViewportScrollTop(
        {
          publisherIndex: 2,
          series: {
            totalCount: 500,
            selectedIndex: 220,
          },
        },
        600
      )
    ).toBe(
      4 +
        2 * PUBLISHER_ROW_HEIGHT +
        PUBLISHER_ROW_HEIGHT +
        161 * SERIES_ROW_HEIGHT +
        59 * SERIES_ROW_HEIGHT -
        278
    );
  });
});
