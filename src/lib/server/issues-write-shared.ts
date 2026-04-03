export function normalizeText(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

export function normalizeOptionalText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized === "" ? null : normalized;
}

export function normalizeBigInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return BigInt(Math.trunc(numeric));
}

export function normalizeFloat(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric =
    typeof value === "number" ? value : Number(String(value).replaceAll(",", ".").trim());
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeTypeList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((entry) => normalizeText(entry)).filter((entry) => entry.length > 0);
  }
  const normalized = normalizeText(raw);
  return normalized ? [normalized] : [];
}

export function normalizeDbIds(values: readonly number[]) {
  return Array.from(new Set(values.filter((id) => Number.isFinite(id) && Math.trunc(id) > 0))).map((id) =>
    Math.trunc(id)
  );
}

export function normalizeStoryTitleKey(value: unknown): string {
  return normalizeText(value)
    .toLowerCase()
    .replaceAll(/[_:;,.!?'"()\-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function coerceReleaseDateForDb(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T00:00:00.000Z`);
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
