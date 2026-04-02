"use client";

import React from "react";
import {
  getInitialWindowRange,
  getNextWindowRange,
  shouldWindowBranch,
} from "./branchWindowing";

export function useBranchWindowing(
  totalCount: number,
  selectedIndex?: number | null,
  deferProgressiveRendering = false
) {
  const windowingEnabled = shouldWindowBranch(totalCount);
  const selectedWindowLocked = typeof selectedIndex === "number" && selectedIndex >= 0;
  const [windowRange, setWindowRange] = React.useState(() =>
    getInitialWindowRange(totalCount, selectedIndex)
  );

  React.useEffect(() => {
    setWindowRange(getInitialWindowRange(totalCount, selectedIndex));
  }, [selectedIndex, totalCount]);

  React.useEffect(() => {
    if (!windowingEnabled) return;
    if (deferProgressiveRendering) return;
    if (selectedWindowLocked) return;
    if (windowRange.start <= 0 && windowRange.end >= totalCount) return;

    let frameId = 0;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      React.startTransition(() => {
        setWindowRange((prev) => getNextWindowRange(prev, totalCount, selectedIndex));
      });
    };

    frameId = window.requestAnimationFrame(run);

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [
    deferProgressiveRendering,
    selectedIndex,
    selectedWindowLocked,
    totalCount,
    windowRange,
    windowingEnabled,
  ]);

  return {
    windowingEnabled,
    windowStart: windowRange.start,
    windowEnd: windowRange.end,
    visibleCount: Math.max(0, windowRange.end - windowRange.start),
  };
}
