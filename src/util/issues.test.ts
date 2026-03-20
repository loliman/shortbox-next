import { generateIssueSubHeader, generateItemTitle } from "./issues";

describe("issues util", () => {
  it("builds story title from parent issue context", () => {
    const title = generateItemTitle(
      {
        __typename: "Story",
        title: "The Night Gwen Stacy Died",
        parent: {
          number: 2,
          format: "HC",
          variant: "B",
          issue: {
            number: "121",
            stories: [{}, {}],
            series: {
              title: "Spider-Man",
              volume: 1,
              publisher: { name: "Marvel" },
            },
          },
        },
      } as never,
      false
    );

    expect(title).toBe("Marvel #121 [II] [HC/B] - The Night Gwen Stacy Died");
  });

  it("uses series context or language-specific fallbacks", () => {
    expect(
      generateItemTitle(
        {
          series: {
            title: "Spider-Man",
            volume: 1,
            publisher: { name: "Marvel" },
          },
          number: "1",
        } as never,
        true
      )
    ).toBe("Marvel #1");

    expect(generateItemTitle({} as never, true)).toBe("Untitled");
    expect(generateItemTitle({} as never, false)).toBe("Exklusiv hier erschienen");
  });

  it("returns plain title when only story title exists", () => {
    expect(generateItemTitle({ title: "Standalone Story" } as never, false)).toBe(
      "Standalone Story"
    );
  });

  it("builds issue subheaders with optional format and variant", () => {
    expect(generateIssueSubHeader({ title: "Issue Title" } as never)).toBe("Issue Title");
    expect(generateIssueSubHeader({ format: "HC" } as never)).toBe(" HC");
    expect(generateIssueSubHeader({ title: "Issue", format: "HC", variant: "B" } as never)).toBe(
      "Issue HC (B Variant)"
    );
  });
});
