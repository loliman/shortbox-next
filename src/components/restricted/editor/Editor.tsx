import type { ApolloCache } from "@apollo/client";
import type { DocumentNode, OperationDefinitionNode } from "graphql";

type CacheItem = object;

type CacheVariables = object | undefined;
type CacheQueryData = Record<string, unknown>;
type CacheEdge = { cursor?: string; node?: CacheItem | null } | null;
type CacheConnection = Record<string, unknown> & { edges?: CacheEdge[] | null };

export function addToCache(
  cache: ApolloCache<unknown>,
  query: DocumentNode,
  variables: CacheVariables,
  item: CacheItem
) {
  const queryName = getQueryName(query);
  if (!queryName) return;

  const data = readCacheQuery(cache, query, variables);
  if (!data || !Object.prototype.hasOwnProperty.call(data, queryName)) return;

  const list = getListRef(data, queryName);
  list.push(item);
  list.sort(compare);
  setListRef(data, queryName, list);

  cache.writeQuery({
    query,
    variables: variables as Record<string, unknown> | undefined,
    data,
  });
}

export function removeFromCache(
  cache: ApolloCache<unknown>,
  query: DocumentNode,
  variables: CacheVariables,
  item: CacheItem
) {
  const queryName = getQueryName(query);
  if (!queryName) return;

  const data = readCacheQuery(cache, query, variables);
  if (!data || !Object.prototype.hasOwnProperty.call(data, queryName)) return;

  const list = getListRef(data, queryName).filter((entry) => compare(entry, item) !== 0);
  setListRef(data, queryName, list);

  cache.writeQuery({
    query,
    variables: variables as Record<string, unknown> | undefined,
    data,
  });
}

export function updateInCache(
  cache: ApolloCache<unknown>,
  query: DocumentNode,
  variables: CacheVariables,
  update: CacheItem,
  item: CacheItem
) {
  const queryName = getQueryName(query);
  if (!queryName) return;

  const data = readCacheQuery(cache, query, variables);
  if (!data || !Object.prototype.hasOwnProperty.call(data, queryName)) return;

  const list = getListRef(data, queryName);

  if (list.length) {
    const index = list.findIndex((entry) => compare(entry, update) === 0);
    if (index >= 0) list[index] = item;
    list.sort(compare);
    setListRef(data, queryName, list);
  } else {
    setListRef(data, queryName, [item]);
  }

  cache.writeQuery({
    query,
    variables: variables as Record<string, unknown> | undefined,
    data,
  });
}

export function compare(a: CacheItem, b: CacheItem) {
  const leftType = lower(getField(a, "__typename"));
  const rightType = lower(getField(b, "__typename"));
  if (leftType !== rightType) return leftType.localeCompare(rightType);

  switch (leftType) {
    case "publisher":
      return lower(getField(a, "name")).localeCompare(lower(getField(b, "name")));
    case "series":
      return `${lower(getField(a, "title"))}${lower(getField(a, "volume"))}`.localeCompare(
        `${lower(getField(b, "title"))}${lower(getField(b, "volume"))}`
      );
    case "issue":
      return `${lower(getField(a, "number"))}|${lower(getField(a, "format"))}|${lower(
        getField(a, "variant")
      )}`.localeCompare(
        `${lower(getField(b, "number"))}|${lower(getField(b, "format"))}|${lower(
          getField(b, "variant")
        )}`
      );
    default:
      return 0;
  }
}

function getQueryName(query: DocumentNode): string | null {
  const operation = query.definitions.find(
    (definition): definition is OperationDefinitionNode =>
      Boolean(definition) && definition.kind === "OperationDefinition"
  );
  if (!operation) return null;

  const firstSelection = operation.selectionSet?.selections?.[0];
  if (firstSelection && firstSelection.kind === "Field") {
    if (firstSelection.alias?.value) return firstSelection.alias.value;
    return firstSelection.name.value;
  }

  return null;
}

function readCacheQuery(
  cache: ApolloCache<unknown>,
  query: DocumentNode,
  variables: CacheVariables
): CacheQueryData | null {
  try {
    const data = cache.readQuery<CacheQueryData>({
      query,
      variables: variables as Record<string, unknown> | undefined,
    });
    return data || null;
  } catch {
    return null;
  }
}

function getListRef(data: CacheQueryData, queryName: string): CacheItem[] {
  const value = data[queryName];
  if (Array.isArray(value)) return value.filter(isCacheItem);

  if (isCacheConnection(value) && Array.isArray(value.edges)) {
    return value.edges.map((edge) => edge?.node).filter(isCacheItem);
  }

  return [];
}

function setListRef(data: CacheQueryData, queryName: string, list: CacheItem[]) {
  const value = data[queryName];
  if (Array.isArray(value)) {
    data[queryName] = list;
    return;
  }

  if (isCacheConnection(value) && Array.isArray(value.edges)) {
    const existingEdges = value.edges;
    data[queryName] = {
      ...value,
      edges: list.map((node, idx) => {
        const existingEdge = existingEdges[idx];
        const cursor =
          existingEdge && typeof existingEdge === "object" && "cursor" in existingEdge
            ? String(existingEdge.cursor || idx)
            : String(idx);

        return { cursor, node };
      }),
    };
  }
}

function isCacheConnection(value: unknown): value is CacheConnection {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCacheItem(value: unknown): value is CacheItem {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function lower(value: unknown): string {
  return String(value || "").toLowerCase();
}

function getField(item: CacheItem, key: string): unknown {
  return (item as Record<string, unknown>)[key];
}
