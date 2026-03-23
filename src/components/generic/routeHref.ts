import queryString from "query-string";

type QueryValue = string | number | boolean | null | undefined;
type QueryRecord = Record<string, QueryValue>;
const TRANSIENT_QUERY_KEYS = ["expand", "from", "navPublisher", "navSeries"] as const;

export function buildRouteHref(
  pathname: string,
  currentQuery?: Record<string, unknown> | null,
  nextQuery?: QueryRecord
) {
  const merged: Record<string, unknown> = currentQuery ? { ...currentQuery } : {};
  for (const key of TRANSIENT_QUERY_KEYS) {
    delete merged[key];
  }

  if (nextQuery) {
    for (const [key, value] of Object.entries(nextQuery)) {
      if (value === null || value === undefined || value === "") {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }
  }

  const search = queryString.stringify(merged);
  return search ? `${pathname}?${search}` : pathname;
}
