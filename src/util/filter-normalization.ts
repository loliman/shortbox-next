type LegacyFilterNormalizeMode = "string-only" | "non-array";

export type LegacyFilterNormalizationOptions = {
  mode?: LegacyFilterNormalizeMode;
  includeRealities?: boolean;
};

const DEFAULT_OPTIONS: Required<LegacyFilterNormalizationOptions> = {
  mode: "string-only",
  includeRealities: false,
};

function splitMultiFilterString(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("||")
    .map((entry) => entry.trim())
    .filter((entry, index, arr) => entry.length > 0 && arr.indexOf(entry) === index);
}

function normalizeNamedField(
  payload: Record<string, unknown>,
  key: "arcs" | "appearances" | "realities",
  itemKey: "title" | "name",
  mode: LegacyFilterNormalizeMode
) {
  const current = payload[key];

  if (mode === "string-only") {
    if (typeof current !== "string") return;
    payload[key] = splitMultiFilterString(current).map((value) => ({ [itemKey]: value }));
    return;
  }

  if (Array.isArray(current)) return;
  payload[key] = splitMultiFilterString(current).map((value) => ({ [itemKey]: value }));
}

export function normalizeLegacyFilterPayload(
  payload: Record<string, unknown>,
  options?: LegacyFilterNormalizationOptions
): Record<string, unknown> {
  const normalized = { ...payload };
  const resolved = { ...DEFAULT_OPTIONS, ...options };

  normalizeNamedField(normalized, "arcs", "title", resolved.mode);
  normalizeNamedField(normalized, "appearances", "name", resolved.mode);
  if (resolved.includeRealities) {
    normalizeNamedField(normalized, "realities", "name", resolved.mode);
  }

  if (normalized.noComicguideId === undefined && normalized.noCover !== undefined) {
    normalized.noComicguideId = Boolean(normalized.noCover);
  }

  if (Boolean(normalized.onlyCollected) && Boolean(normalized.onlyNotCollected)) {
    normalized.onlyNotCollected = false;
  }

  delete normalized.noCover;
  delete normalized.sellable;
  delete normalized.and;

  return normalized;
}

export function parseAndNormalizeLegacyFilter(
  rawFilter: string | null | undefined,
  options?: LegacyFilterNormalizationOptions
): Record<string, unknown> | undefined {
  if (!rawFilter) return undefined;

  try {
    const parsed = JSON.parse(rawFilter) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return undefined;
    return normalizeLegacyFilterPayload(parsed, options);
  } catch {
    return undefined;
  }
}
