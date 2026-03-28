"use client";

import React from "react";
import { usePendingNavigation } from "../generic/usePendingNavigation";

export function shouldHandlePreviewNavigation(event: React.MouseEvent<HTMLElement>) {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return true;
}

export function usePreviewNavigation(href: string) {
  const { isPending, push } = usePendingNavigation();
  const [isLocallyPending, setIsLocallyPending] = React.useState(false);

  React.useEffect(() => {
    if (!isPending) return;
    setIsLocallyPending(true);
  }, [isPending]);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!shouldHandlePreviewNavigation(event)) return;
      event.preventDefault();
      setIsLocallyPending(true);
      push(href);
    },
    [href, push]
  );

  return {
    isNavigating: isPending || isLocallyPending,
    handleClick,
  };
}
