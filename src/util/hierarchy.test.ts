import {
  generateLabel,
  generateUrl,
  getHierarchyLevel,
  getSelected,
  HierarchyLevel,
} from "./hierarchy";

describe("hierarchy util", () => {
  it("detects hierarchy levels", () => {
    expect(getHierarchyLevel({})).toBe(HierarchyLevel.ROOT);
    expect(getHierarchyLevel({ publisher: { name: "Marvel" } })).toBe(HierarchyLevel.PUBLISHER);
    expect(
      getHierarchyLevel({
        series: {
          title: "Spider-Man",
          volume: 1,
          publisher: { name: "Marvel" },
        },
      })
    ).toBe(HierarchyLevel.SERIES);
    expect(
      getHierarchyLevel({
        issue: {
          number: "1",
          series: {
            title: "Spider-Man",
            volume: 1,
            publisher: { name: "Marvel" },
          },
        },
      })
    ).toBe(HierarchyLevel.ISSUE);
  });

  it("builds root and publisher URLs", () => {
    expect(generateUrl({}, true)).toBe("/us/");
    expect(generateUrl({}, false)).toBe("/de/");

    const publisherUrl = generateUrl({ publisher: { name: "Marvel 100%" } }, true);
    expect(publisherUrl).toBe("/us/Marvel%20100%2525");
  });

  it("builds series URL", () => {
    const url = generateUrl(
      {
        series: {
          title: "Spider-Man",
          volume: 2,
          publisher: { name: "Marvel" },
        },
      },
      false
    );

    expect(url).toBe("/de/Marvel/Spider-Man_Vol_2");
  });

  it("builds issue URLs with and without variant", () => {
    const withoutVariant = generateUrl(
      {
        issue: {
          number: "1",
          series: {
            title: "Spider-Man",
            volume: 1,
            publisher: { name: "Marvel" },
          },
        },
      },
      false
    );

    const withFormatOnly = generateUrl(
      {
        issue: {
          number: "1",
          format: "HC",
          variant: "",
          series: {
            title: "Spider-Man",
            volume: 1,
            publisher: { name: "Marvel" },
          },
        },
      },
      false
    );

    const withVariant = generateUrl(
      {
        issue: {
          number: "1",
          format: "HC",
          variant: "B",
          series: {
            title: "Spider-Man",
            volume: 1,
            publisher: { name: "Marvel" },
          },
        },
      },
      false
    );

    expect(withoutVariant).toBe("/de/Marvel/Spider-Man_Vol_1/1");
    expect(withFormatOnly).toBe("/de/Marvel/Spider-Man_Vol_1/1/HC");
    expect(withVariant).toBe("/de/Marvel/Spider-Man_Vol_1/1/HC_B");
  });

  it("supports wrapped typename entities for URL generation", () => {
    const url = generateUrl(
      {
        __typename: "Series",
        title: "Spider-Man",
        volume: 3,
        publisher: { name: "Marvel", us: true },
      } as any,
      true
    );

    expect(url).toBe("/us/Marvel/Spider-Man_Vol_3");
  });

  it("parses modern route params into selected issue object", () => {
    const selected = getSelected(
      {
        publisher: "Marvel",
        series: "Spider-Man_Vol_1",
        issue: "1",
        variant: "HC_B",
      },
      true
    );

    expect(selected).toEqual({
      us: true,
      issue: {
        number: "1",
        format: "HC",
        variant: "B",
        series: {
          title: "Spider-Man",
          volume: 1,
          publisher: { name: "Marvel" },
        },
      },
    });
  });

  it("parses SEO publisher slug on legacy publisher param", () => {
    const selected = getSelected({ publisher: "marvel" }, false);

    expect(selected).toEqual({
      us: false,
      publisher: {
        name: "Marvel",
      },
    });
  });

  it("parses SEO series slug on legacy publisher/series params", () => {
    const selected = getSelected(
      {
        publisher: "marvel",
        series: "amazing-spider-man-1963-vol1",
      },
      false
    );

    expect(selected).toEqual({
      us: false,
      series: {
        title: "Amazing Spider Man",
        volume: 1,
        startyear: 1963,
        publisher: {
          name: "Marvel",
        },
      },
    });
  });

  it("parses SEO issue slug on legacy publisher/series/issue params", () => {
    const selected = getSelected(
      {
        publisher: "marvel",
        series: "amazing-spider-man-1963-vol1",
        issue: "1",
        variant: "heft",
      },
      true
    );

    expect(selected).toEqual({
      us: true,
      issue: {
        number: "1",
        format: "Heft",
        series: {
          title: "Amazing Spider Man",
          volume: 1,
          startyear: 1963,
          publisher: {
            name: "Marvel",
          },
        },
      },
    });
  });

  it("parses SEO issue slug on explicit format/variant params", () => {
    const selected = getSelected(
      {
        publisher: "panini-marvel-icon",
        series: "spider-man-2004-vol2",
        issue: "100",
        format: "heft",
        variant: "analph-comics-zuerich",
      },
      false
    );

    expect(selected).toEqual({
      us: false,
      issue: {
        number: "100",
        format: "Heft",
        variant: "Analph Comics Zuerich",
        series: {
          title: "Spider Man",
          volume: 2,
          startyear: 2004,
          publisher: {
            name: "Panini Marvel Icon",
          },
        },
      },
    });
  });

  it("parses legacy route params with underscore series separator", () => {
    const selected = getSelected(
      {
        publisher: "Marvel",
        series: "Spider-Man_2",
        issue: "5",
        variant: "HC",
      },
      false
    );

    expect(selected).toEqual({
      us: false,
      issue: {
        number: "5",
        format: "HC",
        series: {
          title: "Spider-Man",
          volume: 2,
          publisher: { name: "Marvel" },
        },
      },
    });
  });

  it("defaults volume to 1 when no separator exists", () => {
    const selected = getSelected(
      {
        publisher: "Marvel",
        series: "Spider-Man",
      },
      false
    );

    expect(selected).toEqual({
      us: false,
      series: {
        title: "Spider-Man",
        volume: 1,
        publisher: { name: "Marvel" },
      },
    });
  });

  it("builds readable labels across hierarchy levels", () => {
    expect(generateLabel()).toBe("");
    expect(generateLabel({})).toBe("Shortbox - Das deutsche Archiv für Marvel Comics");
    expect(generateLabel({ publisher: { name: "Marvel" } })).toBe("Marvel");

    expect(
      generateLabel({
        series: {
          title: "Spider-Man",
          volume: 4,
          startyear: 1963,
          publisher: { name: "Marvel" },
        },
      } as any)
    ).toBe("Spider-Man (Vol. IV) (1963)");

    expect(
      generateLabel({
        issue: {
          number: "1",
          series: {
            title: "Spider-Man",
            volume: 1,
            startyear: 1963,
            publisher: { name: "Marvel" },
          },
        },
      } as any)
    ).toBe("Spider-Man (Vol. I) (1963) #1");
  });

  it("builds label for wrapped typename entities", () => {
    const label = generateLabel({
      __typename: "Publisher",
      name: "Marvel",
      us: true,
    } as any);

    expect(label).toBe("Marvel");
  });
});
