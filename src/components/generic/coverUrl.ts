type CoverUrlLike = {
  cover?: { url?: string | null } | null;
  comicguideid?: string | number | null;
};

export function buildComicGuideCoverUrl(comicGuideId: string | number | null | undefined): string {
  const normalized = String(comicGuideId ?? "").trim();
  if (normalized === "" || normalized === "0") return "";
  return `https://www.comicguide.de/pics/large/${normalized}.jpg`;
}

export function getPreferredCoverUrl(item: CoverUrlLike): string {
  const directCover = item.cover?.url?.trim();
  if (directCover) return directCover;

  return buildComicGuideCoverUrl(item.comicguideid);
}
