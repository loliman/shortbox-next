"use client";

import React from "react";
import { useRouter } from "next/navigation";

export function usePendingNavigation() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const push = React.useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router]
  );

  const replace = React.useCallback(
    (href: string) => {
      startTransition(() => {
        router.replace(href);
      });
    },
    [router]
  );

  const refresh = React.useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  return {
    isPending,
    push,
    replace,
    refresh,
  };
}
