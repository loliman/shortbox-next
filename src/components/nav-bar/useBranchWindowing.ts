"use client";

import React from "react";
import {
  getVisibleBranchWindow,
  getInitialWindowRange,
  getNextWindowRange,
  getWindowRangeForVisibleRows,
  shouldWindowBranch,
} from "./branchWindowing";

export function useBranchWindowing(
  totalCount: number,
  selectedIndex?: number | null,
  deferProgressiveRendering = false,
  options?: {
    rowHeight?: number;
    navScrollContainerRef?: React.RefObject<HTMLDivElement | null>;
    branchListRef?: React.RefObject<HTMLElement | null>;
  }
) {
  const windowingEnabled = shouldWindowBranch(totalCount);
  const rowHeight = options?.rowHeight ?? 0;
  const navScrollContainerRef = options?.navScrollContainerRef;
  const branchListRef = options?.branchListRef;
  const [windowRange, setWindowRange] = React.useState(() =>
    getInitialWindowRange(totalCount, selectedIndex)
  );

  React.useEffect(() => {
    setWindowRange(getInitialWindowRange(totalCount, selectedIndex));
  }, [selectedIndex, totalCount]);

  React.useEffect(() => {
    if (!windowingEnabled) return;
    if (!navScrollContainerRef?.current) return;
    if (!branchListRef?.current) return;
    if (rowHeight <= 0) return;

    let frameId = 0;
    let cancelled = false;

    const syncWindowToScrollPosition = () => {
      frameId = 0;
      if (cancelled) return;

      const scrollContainer = navScrollContainerRef.current;
      const branchList = branchListRef.current;
      if (!scrollContainer || !branchList) return;

      const visibleWindow = getVisibleBranchWindow(
        branchList.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top,
        branchList.scrollHeight,
        scrollContainer.clientHeight
      );
      if (!visibleWindow) return;

      setWindowRange((prev) =>
        getWindowRangeForVisibleRows(prev, totalCount, rowHeight, visibleWindow)
      );
    };

    const scheduleSync = () => {
      if (frameId || cancelled) return;
      frameId = globalThis.requestAnimationFrame(syncWindowToScrollPosition);
    };

    const scrollContainer = navScrollContainerRef.current;
    scheduleSync();
    scrollContainer.addEventListener("scroll", scheduleSync, { passive: true });
    globalThis.addEventListener("resize", scheduleSync);

    return () => {
      cancelled = true;
      scrollContainer.removeEventListener("scroll", scheduleSync);
      globalThis.removeEventListener("resize", scheduleSync);
      if (frameId) globalThis.cancelAnimationFrame(frameId);
    };
  }, [branchListRef, navScrollContainerRef, rowHeight, totalCount, windowingEnabled]);

  React.useEffect(() => {
    if (!windowingEnabled) return;
    if (deferProgressiveRendering) return;
    if (windowRange.start <= 0 && windowRange.end >= totalCount) return;

    let frameId = 0;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      React.startTransition(() => {
        setWindowRange((prev) => getNextWindowRange(prev, totalCount, selectedIndex));
      });
    };

    frameId = globalThis.requestAnimationFrame(run);

    return () => {
      cancelled = true;
      if (frameId) globalThis.cancelAnimationFrame(frameId);
    };
  }, [
    deferProgressiveRendering,
    selectedIndex,
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
