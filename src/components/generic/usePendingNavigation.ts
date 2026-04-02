"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useNavigationFeedbackContext } from "./AppContext";

export function usePendingNavigation() {
  const router = useRouter();
  const navigationFeedback = useNavigationFeedbackContext();
  const [isPending, startTransition] = React.useTransition();

  const push = React.useCallback(
    (href: string) => {
      navigationFeedback.beginNavigation();
      startTransition(() => {
        router.push(href);
      });
    },
    [navigationFeedback, router]
  );

  const replace = React.useCallback(
    (href: string) => {
      navigationFeedback.beginNavigation();
      startTransition(() => {
        router.replace(href);
      });
    },
    [navigationFeedback, router]
  );

  const refresh = React.useCallback(() => {
    navigationFeedback.beginNavigation();
    startTransition(() => {
      router.refresh();
    });
  }, [navigationFeedback, router]);

  return {
    isPending,
    navigationPending: navigationFeedback.navigationPending,
    push,
    replace,
    refresh,
  };
}
