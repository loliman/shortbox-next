import {
  pickNavigationIssuePreviewSource,
  serializeNavigationComicGuideId,
} from "./navigation-issue-preview";

describe("navigation-issue-preview", () => {
  it("serializes comic guide ids and rejects empty or zero-like values", () => {
    expect(serializeNavigationComicGuideId(1234n)).toBe("1234");
    expect(serializeNavigationComicGuideId(0n)).toBeNull();
    expect(serializeNavigationComicGuideId(null)).toBeNull();
    expect(serializeNavigationComicGuideId(undefined)).toBeNull();
  });

  it("prefers the first issue with a direct cover url, then one with a comic guide id, and otherwise falls back to the first item", () => {
    const first = { comicGuideId: null, covers: [{ url: "   " }] };
    const second = { comicGuideId: 123n, covers: [{ url: "   " }] };
    const third = { comicGuideId: null, covers: [{ url: "https://cdn.example/cover.jpg" }] };

    expect(pickNavigationIssuePreviewSource([first, third, second])).toBe(third);
    expect(pickNavigationIssuePreviewSource([first, second])).toBe(second);
    expect(pickNavigationIssuePreviewSource([first])).toBe(first);
    expect(pickNavigationIssuePreviewSource([])).toBeNull();
  });
});
