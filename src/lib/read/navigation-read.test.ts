import { describe, expect, it } from "@jest/globals";
import {
  getNavigationSeriesKey,
  matchesNavigationSeriesKey,
  parseNavigationSeriesKey,
} from "./navigation-key";
import { pickNavigationIssuePreviewSource } from "./navigation-issue-preview";

describe("navigation-read", () => {
  it("builds slug-normalized series keys consistent with SEO-selected sidebar state", () => {
    expect(
      getNavigationSeriesKey({
        publisher: "Panini Marvel Icon",
        title: "Spider-Man",
        volume: 2,
        startyear: 2004,
      })
    ).toBe(
      getNavigationSeriesKey({
        publisher: "panini-marvel-icon",
        title: "Spider Man",
        volume: 2,
        startyear: 2004,
      })
    );
  });

  it("parses legacy-like keys with title separators and keeps normalized parts", () => {
    expect(parseNavigationSeriesKey("Panini Marvel Icon|Spider|Man|2")).toEqual({
      publisher: "panini-marvel-icon",
      title: "spiderman",
      volume: "2",
      startyear: "",
    });
  });

  it("parses startyear-aware series keys and keeps normalized parts", () => {
    expect(parseNavigationSeriesKey("Marvel Comics|What If|1|1977")).toEqual({
      publisher: "marvel-comics",
      title: "what-if",
      volume: "1",
      startyear: "1977",
    });
  });

  it("matches non-canonical navOpen keys against canonical DB-backed series nodes", () => {
    expect(
      matchesNavigationSeriesKey("Panini Marvel Icon|Spider Man|2", {
        publisher: "panini-marvel-icon",
        title: "Spider-Man",
        volume: 2,
      })
    ).toBe(true);
  });

  it("distinguishes same-title series by startyear when the key contains one", () => {
    expect(
      matchesNavigationSeriesKey("Marvel Comics|What If|1|1977", {
        publisher: "Marvel Comics",
        title: "What If",
        volume: 1,
        startyear: 1977,
      })
    ).toBe(true);

    expect(
      matchesNavigationSeriesKey("Marvel Comics|What If|1|1977", {
        publisher: "Marvel Comics",
        title: "What If",
        volume: 1,
        startyear: 1989,
      })
    ).toBe(false);
  });

  it("prefers an issue variant with comicguideid when no direct cover url exists", () => {
    const previewSource = pickNavigationIssuePreviewSource([
      {
        comicGuideId: BigInt(0),
        covers: [],
      },
      {
        comicGuideId: BigInt(12345),
        covers: [],
      },
    ]);

    expect(previewSource?.comicGuideId).toBe(BigInt(12345));
  });

  it("prefers a direct cover url over plain placeholder-only variants", () => {
    const previewSource = pickNavigationIssuePreviewSource([
      {
        comicGuideId: BigInt(0),
        covers: [],
      },
      {
        comicGuideId: BigInt(67890),
        covers: [{ url: "https://example.com/cover.jpg" }],
      },
    ]);

    expect(previewSource?.covers?.[0]?.url).toBe("https://example.com/cover.jpg");
  });
});


