"use client";

import React from "react";

type ResolvedImageState = {
  resolvedUrl: string;
  isLoading: boolean;
};

export function useResolvedImageUrl(
  candidateUrl: string,
  fallbackUrl: string
): ResolvedImageState {
  const [state, setState] = React.useState<ResolvedImageState>(() => {
    const nextCandidate = candidateUrl || fallbackUrl;
    if (!nextCandidate || nextCandidate === fallbackUrl) {
      return { resolvedUrl: fallbackUrl, isLoading: false };
    }
    return { resolvedUrl: "", isLoading: true };
  });

  React.useEffect(() => {
    const nextCandidate = candidateUrl || fallbackUrl;
    if (nextCandidate === fallbackUrl) {
      setState({ resolvedUrl: fallbackUrl, isLoading: false });
      return;
    }

    setState({ resolvedUrl: "", isLoading: true });

    let isCancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!isCancelled) setState({ resolvedUrl: nextCandidate, isLoading: false });
    };
    img.onerror = () => {
      if (!isCancelled) setState({ resolvedUrl: fallbackUrl, isLoading: false });
    };
    img.src = nextCandidate;

    return () => {
      isCancelled = true;
    };
  }, [candidateUrl, fallbackUrl]);

  return state;
}
