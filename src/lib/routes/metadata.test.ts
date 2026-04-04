import {
  createHomeMetadata,
  createPageMetadata,
  createRouteMetadata,
  createStaticMetadata,
  createWorkspaceMetadata,
} from "./metadata";

describe("metadata", () => {
  it("normalizes shortbox suffixes, applies canonical urls, and respects explicit robots", () => {
    expect(
      createPageMetadata({
        title: "Spider-Man | Shortbox",
        description: "Friendly neighborhood details",
        canonical: "/de/spider-man",
        robots: { index: false, follow: false },
      })
    ).toEqual(
      expect.objectContaining({
        title: "Spider-Man",
        description: "Friendly neighborhood details",
        alternates: {
          canonical: "https://shortbox.de/de/spider-man",
        },
        robots: {
          index: false,
          follow: false,
        },
      })
    );
  });

  it("applies noindex/follow for variant-like route queries and removes canonical for search routes", () => {
    expect(
      createRouteMetadata({
        title: "Route Title",
        canonical: "/de/panini",
        searchParams: {
          filter: '{"onlyCollected":true}',
        },
      }).robots
    ).toEqual({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });

    const searchMetadata = createRouteMetadata({
      title: "Search Title",
      canonical: "/de/panini",
      searchParams: {
        q: "spider-man",
        utm_source: "newsletter",
      },
    });

    expect(searchMetadata.title).toBe("Search Title");
    expect(searchMetadata.alternates).toBeUndefined();
    expect(searchMetadata.robots).toEqual({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    });
  });

  it("treats tracking-only queries as canonical-safe and keeps home/static/workspace defaults aligned", () => {
    const homeMetadata = createHomeMetadata(true, {
      utm_source: "newsletter",
    });

    expect(homeMetadata.title).toBe("US-Ausgaben");
    expect(homeMetadata.alternates).toEqual({
      canonical: "https://shortbox.de/us",
    });
    expect(homeMetadata.robots).toBeUndefined();

    expect(createStaticMetadata("About", "About Shortbox", { noIndex: true })).toEqual(
      expect.objectContaining({
        title: "About",
        description: "About Shortbox",
        robots: {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
          },
        },
      })
    );

    expect(createWorkspaceMetadata("Filter")).toEqual(
      expect.objectContaining({
        title: "Filter",
        robots: {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
          },
        },
      })
    );
  });
});
