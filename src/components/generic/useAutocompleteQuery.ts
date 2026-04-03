"use client";

import React from "react";
import type { AutocompleteSource } from "../../lib/read/autocomplete-read";

type QueryVariables = Record<string, unknown>;

interface UseAutocompleteQueryParams {
  source: AutocompleteSource;
  variables?: QueryVariables;
  enabled?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  searchText?: string;
}

interface UseAutocompleteQueryResult<TOption> {
  options: TOption[];
  loading: boolean;
  error: unknown;
  fetching: boolean;
  hasMore: boolean;
  isBelowMinLength: boolean;
  onListboxScroll: (e: React.UIEvent<HTMLElement>) => void;
}

export function useAutocompleteQuery<TOption>({
  source,
  variables: inputVariables = {},
  enabled = true,
  debounceMs = 250,
  minQueryLength = 0,
  searchText = "",
}: UseAutocompleteQueryParams): UseAutocompleteQueryResult<TOption> {
  const [fetching, setFetching] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const fetchMoreInFlightRef = React.useRef(false);
  const inputKey = React.useMemo(() => JSON.stringify(inputVariables || {}), [inputVariables]);
  const [debouncedInputKey, setDebouncedInputKey] = React.useState(inputKey);

  React.useEffect(() => {
    const handle = globalThis.setTimeout(() => {
      setDebouncedInputKey(inputKey);
    }, debounceMs);

    return () => globalThis.clearTimeout(handle);
  }, [inputKey, debounceMs]);

  const parsedInputVariables = React.useMemo(
    () => JSON.parse(debouncedInputKey) as QueryVariables,
    [debouncedInputKey]
  );
  const trimmedSearchText = searchText.trim();
  const isBelowMinLength = trimmedSearchText.length < minQueryLength;
  const skip = !enabled || isBelowMinLength;
  const [options, setOptions] = React.useState<TOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const offset = options.length;
  const activeRequestKeyRef = React.useRef("");

  const loadPage = React.useCallback(
    async (nextOffset: number) => {
      if (skip) {
        return { items: [] as TOption[], hasMore: false };
      }

      const response = await fetch("/api/public-autocomplete", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source,
          variables: parsedInputVariables,
          offset: nextOffset,
          limit: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Autocomplete request failed: ${response.status}`);
      }

      const payload = (await response.json()) as { items?: TOption[]; hasMore?: boolean };
      return {
        items: Array.isArray(payload.items) ? payload.items : [],
        hasMore: Boolean(payload.hasMore),
      };
    },
    [parsedInputVariables, skip, source]
  );

  React.useEffect(() => {
    let cancelled = false;
    const requestKey = `${source}:${debouncedInputKey}`;
    activeRequestKeyRef.current = requestKey;
    setOptions([]);
    setHasMore(true);
    setError(null);

    if (skip) {
      setLoading(false);
      return;
    }

    setLoading(true);

    void loadPage(0)
      .then((result) => {
        if (cancelled || activeRequestKeyRef.current !== requestKey) return;
        setOptions(result.items);
        setHasMore(result.hasMore);
      })
      .catch((nextError) => {
        if (cancelled) return;
        setOptions([]);
        setHasMore(false);
        setError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedInputKey, loadPage, skip, source]);

  const onListboxScroll = (e: React.UIEvent<HTMLElement>) => {
    if (!(e.target instanceof HTMLElement)) return;
    const element = e.target;
    if (skip || !hasMore || loading || fetching || fetchMoreInFlightRef.current) return;

    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    const prefetchPx = Math.max(200, Math.floor(element.clientHeight * 0.5));
    const isNearBottom = remaining <= prefetchPx;
    if (!isNearBottom) return;

    fetchMoreInFlightRef.current = true;
    setFetching(true);
    setError(null);
    const requestKey = activeRequestKeyRef.current;

    void loadPage(offset)
      .then((result) => {
        if (activeRequestKeyRef.current !== requestKey) return;
        setOptions((prev) => [...prev, ...result.items]);
        setHasMore(result.hasMore);
      })
      .catch((nextError) => {
        setError(nextError);
      })
      .finally(() => {
        fetchMoreInFlightRef.current = false;
        setFetching(false);
      });
  };

  return {
    options,
    loading: Boolean(enabled && !isBelowMinLength && loading),
    error,
    fetching,
    hasMore,
    isBelowMinLength,
    onListboxScroll,
  };
}
