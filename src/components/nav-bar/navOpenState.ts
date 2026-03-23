export type NavOpenState = {
  publishers: string[];
  series: string[];
};

export function emptyNavOpenState(): NavOpenState {
  return {
    publishers: [],
    series: [],
  };
}

function normalizeEntries(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const deduped = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized) continue;
    deduped.add(normalized);
  }

  return Array.from(deduped);
}

export function parseNavOpenState(rawValue: unknown): NavOpenState {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return emptyNavOpenState();
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      publishers?: unknown;
      series?: unknown;
    };

    return {
      publishers: normalizeEntries(parsed.publishers),
      series: normalizeEntries(parsed.series),
    };
  } catch {
    return emptyNavOpenState();
  }
}

export function readNavOpenStateFromQuery(query?: {
  navOpen?: unknown;
  navPublisher?: unknown;
  navSeries?: unknown;
} | null): NavOpenState {
  const parsed = parseNavOpenState(query?.navOpen);
  const publishers = new Set(parsed.publishers);
  const series = new Set(parsed.series);

  if (typeof query?.navPublisher === "string" && query.navPublisher.trim() !== "") {
    publishers.add(query.navPublisher.trim());
  }

  if (typeof query?.navSeries === "string" && query.navSeries.trim() !== "") {
    const seriesKey = query.navSeries.trim();
    series.add(seriesKey);
    const [publisher = ""] = seriesKey.split("|");
    if (publisher) publishers.add(publisher);
  }

  return {
    publishers: Array.from(publishers),
    series: Array.from(series),
  };
}

export function serializeNavOpenState(state: NavOpenState): string | null {
  const normalized = {
    publishers: normalizeEntries(state.publishers),
    series: normalizeEntries(state.series),
  };

  if (normalized.publishers.length === 0 && normalized.series.length === 0) {
    return null;
  }

  return JSON.stringify(normalized);
}

export function isPublisherExpanded(state: NavOpenState, publisherName: string) {
  return state.publishers.includes(publisherName);
}

export function isSeriesExpanded(state: NavOpenState, seriesKey: string) {
  return state.series.includes(seriesKey);
}

export function expandPublisher(state: NavOpenState, publisherName: string): NavOpenState {
  if (!publisherName) return state;
  if (state.publishers.includes(publisherName)) return state;

  return {
    publishers: [...state.publishers, publisherName],
    series: state.series,
  };
}

export function collapsePublisher(state: NavOpenState, publisherName: string): NavOpenState {
  if (!publisherName) return state;

  return {
    publishers: state.publishers.filter((entry) => entry !== publisherName),
    series: state.series.filter((seriesKey) => !seriesKey.startsWith(`${publisherName}|`)),
  };
}

export function expandSeries(
  state: NavOpenState,
  publisherName: string,
  seriesKey: string
): NavOpenState {
  const withPublisher = expandPublisher(state, publisherName);
  if (!seriesKey || withPublisher.series.includes(seriesKey)) return withPublisher;

  return {
    publishers: withPublisher.publishers,
    series: [...withPublisher.series, seriesKey],
  };
}

export function collapseSeries(state: NavOpenState, seriesKey: string): NavOpenState {
  if (!seriesKey) return state;

  return {
    publishers: state.publishers,
    series: state.series.filter((entry) => entry !== seriesKey),
  };
}
