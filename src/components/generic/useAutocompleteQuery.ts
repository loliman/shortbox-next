import React from "react";
import { useQuery } from "@apollo/client";
import type { DocumentNode, OperationDefinitionNode } from "graphql";
import type { Connection, QueryCollection } from "../../types/graphql";

type QueryVariables = Record<string, unknown>;
type QueryResultMap = Record<string, QueryCollection<unknown>>;

interface UseAutocompleteQueryParams {
  query: DocumentNode;
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
  query,
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
    const handle = window.setTimeout(() => {
      setDebouncedInputKey(inputKey);
    }, debounceMs);

    return () => window.clearTimeout(handle);
  }, [inputKey, debounceMs]);

  const parsedInputVariables = React.useMemo(
    () => JSON.parse(debouncedInputKey) as QueryVariables,
    [debouncedInputKey]
  );
  const queryName = React.useMemo(() => getQueryName(query), [query]);
  const offsetMode = queryName === "nodes";
  const trimmedSearchText = searchText.trim();
  const isBelowMinLength = trimmedSearchText.length < minQueryLength;
  const skip = !enabled || !queryName || isBelowMinLength;

  const variables = React.useMemo(() => {
    const next = { ...parsedInputVariables };
    if (offsetMode) {
      next.offset = 0;
      if (!next.pattern) next.pattern = "";
    } else {
      next.after = null;
      next.first = next.first || 50;
    }
    return next;
  }, [parsedInputVariables, offsetMode]);

  React.useEffect(() => {
    setHasMore(true);
  }, [debouncedInputKey, skip]);

  const { loading, error, data, fetchMore } = useQuery<QueryResultMap, QueryVariables>(query, {
    variables,
    skip,
    notifyOnNetworkStatusChange: true,
  });

  const rawResult = data ? (data as QueryResultMap)[queryName] : null;
  const options = React.useMemo(
    () => normalizeResult<TOption>(rawResult as QueryCollection<TOption> | null | undefined),
    [rawResult]
  );
  const offset = options.length;
  const endCursor =
    isConnection(rawResult) && rawResult.pageInfo ? rawResult.pageInfo.endCursor : null;
  const remoteHasNextPage =
    isConnection(rawResult) && rawResult.pageInfo ? Boolean(rawResult.pageInfo.hasNextPage) : false;

  React.useEffect(() => {
    if (!offsetMode && data) setHasMore(remoteHasNextPage);
  }, [offsetMode, data, remoteHasNextPage]);

  const fetchMoreVars = React.useMemo(() => {
    const next = { ...parsedInputVariables };
    if (offsetMode) {
      next.offset = offset || 0;
      if (!next.pattern) next.pattern = "";
    } else {
      next.after = endCursor || null;
      next.first = next.first || 50;
    }
    return next;
  }, [parsedInputVariables, offset, offsetMode, endCursor]);

  const onListboxScroll = (e: React.UIEvent<HTMLElement>) => {
    const element = e.target as HTMLElement | null;
    if (!element) return;
    if (skip || !hasMore || loading || fetching || fetchMoreInFlightRef.current) return;

    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    const prefetchPx = Math.max(200, Math.floor(element.clientHeight * 0.5));
    const isNearBottom = remaining <= prefetchPx;
    if (!isNearBottom) return;

    fetchMoreInFlightRef.current = true;
    setFetching(true);

    void fetchMore({
      variables: fetchMoreVars,
      updateQuery: (
        prev: QueryResultMap,
        { fetchMoreResult }: { fetchMoreResult?: QueryResultMap | null }
      ) => {
        if (!fetchMoreResult) return prev;

        if (offsetMode) {
          const previousList = Array.isArray(prev[queryName])
            ? prev[queryName].filter(Boolean)
            : [];
          const nextList = Array.isArray(fetchMoreResult[queryName])
            ? fetchMoreResult[queryName].filter(Boolean)
            : [];
          const expectedOffset = Number(fetchMoreVars.offset || 0);

          if (previousList.length !== expectedOffset) return prev;
          if (nextList.length === 0) setHasMore(false);

          return {
            ...prev,
            [queryName]: [...previousList, ...nextList],
          };
        }

        const previousConnection = prev && prev[queryName] ? prev[queryName] : null;
        const nextConnection = fetchMoreResult[queryName];
        if (!isConnection(previousConnection) || !isConnection(nextConnection)) return prev;

        const nextEdges = nextConnection.edges || [];
        const mergedEdges = [...(previousConnection.edges || []), ...nextEdges];
        const nextPageInfo = nextConnection.pageInfo
          ? nextConnection.pageInfo
          : previousConnection.pageInfo;

        setHasMore(Boolean(nextPageInfo && nextPageInfo.hasNextPage));

        return {
          ...prev,
          [queryName]: {
            ...previousConnection,
            edges: mergedEdges,
            pageInfo: nextPageInfo,
          },
        };
      },
    }).finally(() => {
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

function getQueryName(query: DocumentNode): string {
  const operation = query.definitions.find(
    (definition): definition is OperationDefinitionNode =>
      Boolean(definition) && definition.kind === "OperationDefinition"
  );
  if (!operation) return "";

  const firstSelection = operation.selectionSet?.selections?.[0];
  if (firstSelection && firstSelection.kind === "Field") {
    if (firstSelection.alias?.value) return firstSelection.alias.value;
    return firstSelection.name.value;
  }

  return "";
}

function isConnection<T>(value: QueryCollection<T> | null | undefined): value is Connection<T> {
  return !!value && !Array.isArray(value) && "edges" in value && "pageInfo" in value;
}

function normalizeResult<T>(value: QueryCollection<T> | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as T[];

  return value.edges
    .map((edge: { node?: T | null } | null) => edge && edge.node)
    .filter(Boolean) as T[];
}
