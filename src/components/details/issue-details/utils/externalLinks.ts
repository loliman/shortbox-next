type IssueLike = {
  comicguideid?: string | number;
  series: { title: string; volume: number };
  number: string;
};

export function generateComicGuideUrl(issue: IssueLike): string {
  return "https://www.comicguide.de/book/" + issue.comicguideid;
}

export function generateMarvelDbUrl(issue: IssueLike): string {
  const path =
    encodeURIComponent(issue.series.title) + "_Vol_" + issue.series.volume + "_" + issue.number;
  return "https://marvel.fandom.com/wiki/" + path.split("%20").join("_");
}
