type CoverUrlLike = {
  cover?: { url?: string | null } | null;
  comicguideid?: string | number | null;
  gcdid?: string | number | null;
};

export function buildComicGuideCoverUrl(comicGuideId: string | number | null | undefined): string {
  let normalized = "";
  if (typeof comicGuideId === "string") {
    normalized = comicGuideId.trim();
  } else if (typeof comicGuideId === "number") {
    normalized = String(comicGuideId).trim();
  }
  if (normalized === "" || normalized === "0") return "";
  return `https://www.comicguide.de/pics/large/${normalized}.jpg`;
}

export function buildGcdCoverUrl(gcdId: string | number | null | undefined): string {
  let normalized = "";
  if (typeof gcdId === "string") {
    normalized = gcdId.trim();
  } else if (typeof gcdId === "number") {
    normalized = String(gcdId).trim();
  }
  if (!/^\d+$/.test(normalized) || normalized === "0") return "";
  return `https://www.comics.org/issue/${normalized}/cover/4/`;
}

export function getPreferredCoverUrl(item: CoverUrlLike): string {
  const directCover = item.cover?.url?.trim();
  if (directCover) return directCover;

  const comicGuideCover = buildComicGuideCoverUrl(item.comicguideid);
  if (comicGuideCover) return comicGuideCover;

  return buildGcdCoverUrl(item.gcdid);
}
