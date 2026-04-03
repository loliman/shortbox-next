export interface IssueCopyBatchInput {
  enabled?: boolean | null;
  count?: number | string | null;
  prefix?: string | null;
}

export interface NormalizedIssueCopyBatch {
  count: number;
  prefix: string;
}

const VARIANT_SUFFIXES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const MAX_VARIANT_BATCH_COUNT = VARIANT_SUFFIXES.length;

export function clampIssueCopyBatchCount(
  value: IssueCopyBatchInput["count"],
  fallback = 1
): number {
  if (value === null || value === undefined || value === "") return fallback;

  const parsed =
    typeof value === "number" ? Math.trunc(value) : Number.parseInt(String(value).trim(), 10);

  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_VARIANT_BATCH_COUNT, Math.max(1, parsed));
}

function toCount(value: IssueCopyBatchInput["count"]): number {
  if (value === null || value === undefined || value === "") return 1;
  const parsed =
    typeof value === "number" ? Math.trunc(value) : Number.parseInt(String(value).trim(), 10);

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_VARIANT_BATCH_COUNT) {
    throw new Error("Anzahl muss zwischen 1 und 26 liegen");
  }

  return parsed;
}

export function normalizeIssueCopyBatch(input?: IssueCopyBatchInput | null): NormalizedIssueCopyBatch {
  return {
    count: toCount(input?.count),
    prefix: readTextValue(input?.prefix),
  };
}

export function shouldGenerateVariantBatch(input?: IssueCopyBatchInput | null): boolean {
  const normalized = normalizeIssueCopyBatch(input);
  return Boolean(input?.enabled) && (normalized.count > 1 || normalized.prefix.length > 0);
}

export function buildVariantBatchLabels(input?: IssueCopyBatchInput | null): string[] {
  const normalized = normalizeIssueCopyBatch(input);

  return Array.from({ length: normalized.count }, (_, index) => {
    const suffix = VARIANT_SUFFIXES[index] || "";
    return normalized.prefix ? `${normalized.prefix} ${suffix}` : suffix;
  });
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
