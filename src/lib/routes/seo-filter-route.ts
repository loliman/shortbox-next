export type SeoFilterKind = "person" | "arc" | "appearance" | "genre";

const SEO_FILTER_KINDS = new Set<SeoFilterKind>(["person", "arc", "appearance", "genre"]);

export type SeoFilterRouteMatch = {
  kind: SeoFilterKind;
  slug: string;
};

export function isSeoFilterKind(value: unknown): value is SeoFilterKind {
  return typeof value === "string" && SEO_FILTER_KINDS.has(value as SeoFilterKind);
}

export function parseSeoFilterRouteParts(parts: string[]): SeoFilterRouteMatch | null {
  if (parts.length < 3) return null;

  const kind = parts[1];
  const slug = parts[2];
  if (!isSeoFilterKind(kind) || !slug) return null;

  return {
    kind,
    slug,
  };
}

export function parseSeoFilterRoutePathname(pathname?: string | null): SeoFilterRouteMatch | null {
  if (!pathname) return null;
  const parts = pathname.split("/").filter(Boolean);
  return parseSeoFilterRouteParts(parts);
}

