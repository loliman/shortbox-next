import {
  getIssuePreviewBorderRadius,
  getIssuePreviewCover,
  getIssuePreviewFlags,
  getIssueVariantLabel,
} from "./issuePreviewUtils";

describe("issuePreviewUtils", () => {
  it("builds variant labels from format and variant", () => {
    expect(getIssueVariantLabel({})).toBe("");
    expect(getIssueVariantLabel({ format: "HC" })).toBe("HC");
    expect(getIssueVariantLabel({ format: "HC", variant: "B" })).toBe("HC (B Variant)");
  });

  it("chooses direct cover, then comicguide cover, and otherwise returns empty preview cover", () => {
    expect(
      getIssuePreviewCover(
        {
          cover: { url: " https://cdn/direct.jpg " },
        }
      )
    ).toEqual({
      coverUrl: "https://cdn/direct.jpg",
      blurCover: false,
    });

    expect(
      getIssuePreviewCover(
        {
          comicguideid: 12345,
        }
      )
    ).toEqual({
      coverUrl: "https://www.comicguide.de/pics/large/12345.jpg",
      blurCover: false,
    });

    expect(getIssuePreviewCover({})).toEqual({
      coverUrl: "",
      blurCover: false,
    });
  });

  it("computes border radius for first/middle/last entries", () => {
    expect(getIssuePreviewBorderRadius(0, false)).toBe("8px 8px 0 0");
    expect(getIssuePreviewBorderRadius(0, true)).toBe("8px");
    expect(getIssuePreviewBorderRadius(2, true)).toBe("0 0 8px 8px");
    expect(getIssuePreviewBorderRadius(2, false)).toBe(0);
  });

  it("derives DE preview flags from stories and parent relations", () => {
    const flags = getIssuePreviewFlags(
      {
        stories: [
          {
            onlyapp: true,
            parent: {
              children: [{}, {}],
              collectedmultipletimes: true,
            },
          },
        ],
      },
      false,
      true
    );

    expect(flags.collected).toBe(false);
    expect(flags.collectedMultipleTimes).toBe(true);
    expect(flags.sellable).toBe(1);
    expect(flags.hasOnlyApp).toBe(true);
    expect(flags.isPureReprintDe).toBe(true);
    expect(flags.hasNoStoriesDe).toBe(false);
  });

  it("derives US preview flags and resets session fields without session", () => {
    const issue = {
      collected: false,
      stories: [
        {
          firstapp: true,
          otheronlytb: true,
          exclusive: true,
          onlyoneprint: true,
          onlytb: true,
          reprintOf: { issue: { number: "1" } },
          reprints: [{ issue: { number: "2" } }],
          collectedmultipletimes: true,
          children: [{ issue: { collected: true } }, null],
        },
      ],
    };

    const withSession = getIssuePreviewFlags(issue, true, true);
    expect(withSession.collected).toBe(true);
    expect(withSession.collectedMultipleTimes).toBe(true);
    expect(withSession.sellable).toBe(0);
    expect(withSession.hasFirstApp).toBe(true);
    expect(withSession.hasOtherOnlyTb).toBe(true);
    expect(withSession.hasExclusive).toBe(true);
    expect(withSession.hasOnlyOnePrintUs).toBe(true);
    expect(withSession.hasOnlyTbUs).toBe(true);
    expect(withSession.hasReprintOfUs).toBe(true);
    expect(withSession.hasReprintsUs).toBe(true);
    expect(withSession.notPublishedInDe).toBe(false);

    const withoutSession = getIssuePreviewFlags(issue, true, false);
    expect(withoutSession.collected).toBe(false);
    expect(withoutSession.collectedMultipleTimes).toBe(false);
    expect(withoutSession.sellable).toBe(0);
  });

  it("marks empty DE stories as no-story previews", () => {
    const flags = getIssuePreviewFlags({ stories: [] }, false, true);
    expect(flags.hasNoStoriesDe).toBe(true);
  });
});
