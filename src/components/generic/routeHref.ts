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

  // Clear filter if switching between US and DE namespaces
  if (typeof merged.filter === "string") {
    try {
      const parsed = JSON.parse(merged.filter);
      const currentFilterUs = Boolean(parsed.us);
      const cleanPath = pathname.startsWith("/") ? pathname : "/" + pathname;
      const destUs = cleanPath.startsWith("/us") || cleanPath.startsWith("/filter/us");
      const destDe = cleanPath.startsWith("/de") || cleanPath.startsWith("/filter/de");
      
      if ((destUs && !currentFilterUs) || (destDe && currentFilterUs)) {
        delete merged.filter;
      }
    } catch {
      // Ignore JSON parse errors for malformed filters
    }
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
