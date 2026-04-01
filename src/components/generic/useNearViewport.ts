"use client";

import React from "react";

type UseNearViewportOptions = {
  rootMargin?: string;
};

export function useNearViewport(options?: UseNearViewportOptions) {
  const [isNearViewport, setIsNearViewport] = React.useState(false);
  const elementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const node = elementRef.current;
    if (!node || isNearViewport) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setIsNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: options?.rootMargin ?? "400px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isNearViewport, options?.rootMargin]);

  return {
    isNearViewport,
    setElement: React.useCallback((node: HTMLElement | null) => {
      elementRef.current = node;
    }, []),
  };
}
