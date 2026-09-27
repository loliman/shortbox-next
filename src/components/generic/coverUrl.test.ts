import {
  buildComicGuideCoverUrl,
  buildGcdCoverUrl,
  getPreferredCoverUrl,
} from "./coverUrl";

describe("buildComicGuideCoverUrl", () => {
  it("should return valid ComicGuide URL when numeric id is provided", () => {
    expect(buildComicGuideCoverUrl(12345)).toBe(
      "https://www.comicguide.de/pics/large/12345.jpg"
    );
  });

  it("should return valid ComicGuide URL when string id is provided", () => {
    expect(buildComicGuideCoverUrl("67890")).toBe(
      "https://www.comicguide.de/pics/large/67890.jpg"
    );
  });

  it("should return empty string when id is 0, empty, null or undefined", () => {
    expect(buildComicGuideCoverUrl(0)).toBe("");
    expect(buildComicGuideCoverUrl("0")).toBe("");
    expect(buildComicGuideCoverUrl("")).toBe("");
    expect(buildComicGuideCoverUrl("   ")).toBe("");
    expect(buildComicGuideCoverUrl(null)).toBe("");
    expect(buildComicGuideCoverUrl(undefined)).toBe("");
  });
});

describe("buildGcdCoverUrl", () => {
  it("should return valid GCD cover URL when numeric id is provided", () => {
    expect(buildGcdCoverUrl(123456)).toBe(
      "https://www.comics.org/issue/123456/cover/4/"
    );
  });

  it("should return valid GCD cover URL when string id is provided", () => {
    expect(buildGcdCoverUrl("654321")).toBe(
      "https://www.comics.org/issue/654321/cover/4/"
    );
  });

  it("should return empty string when id is 0, empty, non-numeric, null or undefined", () => {
    expect(buildGcdCoverUrl(0)).toBe("");
    expect(buildGcdCoverUrl("0")).toBe("");
    expect(buildGcdCoverUrl("")).toBe("");
    expect(buildGcdCoverUrl("   ")).toBe("");
    expect(buildGcdCoverUrl("abc")).toBe("");
    expect(buildGcdCoverUrl(null)).toBe("");
    expect(buildGcdCoverUrl(undefined)).toBe("");
  });
});

describe("getPreferredCoverUrl", () => {
  it("should prioritize direct cover when present", () => {
    const result = getPreferredCoverUrl({
      cover: { url: "https://example.com/direct.jpg" },
      comicguideid: 12345,
      gcdid: 67890,
    });
    expect(result).toBe("https://example.com/direct.jpg");
  });

  it("should fall back to ComicGuide when direct cover is missing", () => {
    const result = getPreferredCoverUrl({
      comicguideid: 12345,
      gcdid: 67890,
    });
    expect(result).toBe("https://www.comicguide.de/pics/large/12345.jpg");
  });

  it("should fall back to ComicGuide when direct cover url is empty", () => {
    const result = getPreferredCoverUrl({
      cover: { url: "  " },
      comicguideid: "12345",
      gcdid: "67890",
    });
    expect(result).toBe("https://www.comicguide.de/pics/large/12345.jpg");
  });

  it("should fall back to GCD when direct cover and ComicGuide are missing", () => {
    const result = getPreferredCoverUrl({
      gcdid: 67890,
    });
    expect(result).toBe("https://www.comics.org/issue/67890/cover/4/");
  });

  it("should fall back to GCD when ComicGuide id is 0 or empty", () => {
    const result = getPreferredCoverUrl({
      comicguideid: 0,
      gcdid: "67890",
    });
    expect(result).toBe("https://www.comics.org/issue/67890/cover/4/");
  });

  it("should return empty string when direct cover, ComicGuide and GCD are all missing or empty", () => {
    expect(getPreferredCoverUrl({})).toBe("");
    expect(
      getPreferredCoverUrl({
        cover: null,
        comicguideid: 0,
        gcdid: 0,
      })
    ).toBe("");
    expect(
      getPreferredCoverUrl({
        comicguideid: "",
        gcdid: "",
      })
    ).toBe("");
  });
});
