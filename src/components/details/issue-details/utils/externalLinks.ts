type IssueLike = {
  comicguideid?: string | number | null;
  series?: { title?: string | null; volume?: number | null } | null;
  number?: string | null;
};

export function generateComicGuideUrl(issue: IssueLike): string {
  return "https://www.comicguide.de/book/" + issue.comicguideid;
}

export function generateMarvelDbUrl(issue: IssueLike): string {
  const path =
    encodeURIComponent(issue.series?.title || "") +
    "_Vol_" +
    String(issue.series?.volume ?? "") +
    "_" +
    String(issue.number ?? "");
  return "https://marvel.fandom.com/wiki/" + path.split("%20").join("_");
}
