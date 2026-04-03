type IssueLike = {
  comicguideid?: string | number | null;
  series?: { title?: string | null; volume?: number | null } | null;
  number?: string | null;
};

export function generateComicGuideUrl(issue: IssueLike): string {
  return "https://www.comicguide.de/book/" + issue.comicguideid;
}

export function generateMarvelDbUrl(issue: IssueLike): string {
  const volume = issue.series?.volume != null ? String(issue.series.volume) : "";
  const issueNumber = issue.number || "";
  const path =
    encodeURIComponent(issue.series?.title || "") +
    "_Vol_" +
    volume +
    "_" +
    issueNumber;
  return "https://marvel.fandom.com/wiki/" + path.split("%20").join("_");
}
