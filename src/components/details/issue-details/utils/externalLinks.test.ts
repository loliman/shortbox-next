import { generateComicGuideUrl, generateMarvelDbUrl } from "./externalLinks";

describe("externalLinks util", () => {
  it("builds ComicGuide URL from issue id", () => {
    expect(
      generateComicGuideUrl({
        comicguideid: 12345,
        series: { title: "Spider-Man", volume: 1 },
        number: "1",
      })
    ).toBe("https://www.comicguide.de/book/12345");
  });

  it("builds Marvel DB URL with underscore separated path", () => {
    const url = generateMarvelDbUrl({
      series: { title: "Spider-Man Team Up", volume: 2 },
      number: "15",
    });

    expect(url).toBe("https://marvel.fandom.com/wiki/Spider-Man_Team_Up_Vol_2_15");
  });
});
