import { describe, expect, it } from "@jest/globals";
import { buildComicGuideCoverUrl, getPreferredCoverUrl } from "./coverUrl";

describe("coverUrl", () => {
  it("builds a comicguide cover url for a valid id", () => {
    expect(buildComicGuideCoverUrl("12345")).toBe(
      "https://www.comicguide.de/pics/large/12345.jpg"
    );
  });

  it("returns the comicguide cover url when no direct cover exists", () => {
    expect(
      getPreferredCoverUrl({
        cover: null,
        comicguideid: "67890",
      })
    ).toBe("https://www.comicguide.de/pics/large/67890.jpg");
  });

  it("prefers a direct cover url over comicguide", () => {
    expect(
      getPreferredCoverUrl({
        cover: { url: "https://example.com/direct.jpg" },
        comicguideid: "67890",
      })
    ).toBe("https://example.com/direct.jpg");
  });

  it("returns an empty string for missing preview sources", () => {
    expect(
      getPreferredCoverUrl({
        cover: null,
        comicguideid: null,
      })
    ).toBe("");
  });
});

