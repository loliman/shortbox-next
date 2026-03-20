import React from "react";
import { useQuery } from "@apollo/client";
import type { DocumentNode, OperationDefinitionNode } from "graphql";
import type { Connection, QueryCollection } from "../../types/graphql";

type QueryVariables = Record<string, unknown>;
type QueryResultMap = Record<string, QueryCollection<unknown>>;

interface PaginatedQueryRenderProps {
  query: DocumentNode;
  variables: QueryVariables;
  loading: boolean;
  error: unknown;
  data: Record<string, any>;
  fetching: boolean;
  networkStatus: number;
  hasMore: boolean;
  fetchMore: (e: React.UIEvent<HTMLElement>) => void;
}

interface PaginatedQueryProps {
  query: DocumentNode;
  variables?: QueryVariables;
  onCompleted?: () => void;
  queryDeduplication?: boolean;
  notifyOnNetworkStatusChange?: boolean;
  children: (value: PaginatedQueryRenderProps) => React.ReactNode;
}

function PaginatedQuery(props: Readonly<PaginatedQueryProps>) {
  const {
    query,
    onCompleted,
    variables: inputVariables = {},
    notifyOnNetworkStatusChange = true,
    children,
  } = props;
  const [fetching, setFetching] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const fetchMoreInFlightRef = React.useRef(false);
  const queryName = getQueryName(query);
  const offsetMode = queryName === "nodes";
  const onCompletedRef = React.useRef(onCompleted);

  const inputKey = React.useMemo(() => JSON.stringify(inputVariables || {}), [inputVariables]);
  const parsedInputVariables = React.useMemo(() => JSON.parse(inputKey), [inputKey]);

  React.useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

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
  }, [inputKey]);

  const { loading, error, data, previousData, fetchMore, networkStatus } = useQuery<
    QueryResultMap,
    QueryVariables
  >(query, {
    variables,
    notifyOnNetworkStatusChange,
  });
  const resolvedData = data ?? (loading ? previousData : undefined);

  React.useEffect(() => {
    if ((resolvedData || error) && onCompletedRef.current) onCompletedRef.current();
  }, [resolvedData, error]);

  const rawResult = resolvedData
    ? (resolvedData as Record<string, QueryCollection<unknown>>)[queryName]
    : null;
  const normalized = normalizeResult(rawResult);
  const offset = normalized ? normalized.length : 0;
  const endCursor =
    isConnection(rawResult) && rawResult.pageInfo ? rawResult.pageInfo.endCursor : null;
  const remoteHasNextPage =
    isConnection(rawResult) && rawResult.pageInfo ? Boolean(rawResult.pageInfo.hasNextPage) : false;

  React.useEffect(() => {
    if (!offsetMode && resolvedData) {
      setHasMore(remoteHasNextPage);
    }
  }, [offsetMode, resolvedData, remoteHasNextPage]);

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

  const fetchMoreOnScroll = (e: React.UIEvent<HTMLElement>, reload: () => void) => {
    const element = e.target as HTMLElement | null;
    if (!element) return;
    if (!hasMore || loading || fetching || fetchMoreInFlightRef.current) return;

    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    const prefetchPx = Math.max(200, Math.floor(element.clientHeight * 0.5));
    const isNearBottom = remaining <= prefetchPx;
    if (!isNearBottom) return;

    reload();
  };

  return children({
    query,
    variables,
    loading,
    error,
    data: { ...(resolvedData || {}), [queryName]: normalized } as Record<string, any>,
    fetching,
    networkStatus,
    hasMore,
    fetchMore: (e: React.UIEvent<HTMLElement>) =>
      fetchMoreOnScroll(e, () => {
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
      }),
  });
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

export default PaginatedQuery;
