const resolveSeoFilterLanding = jest.fn();

jest.mock("./seo-filter-landing", () => ({
  resolveSeoFilterLanding: (input: { us: boolean; kind: string; slug: string }) =>
    resolveSeoFilterLanding(input),
}));

import { resolveNavigationFilterQuery } from "./seo-filter-navigation";

describe("seo-filter-navigation", () => {
  beforeEach(() => {
    resolveSeoFilterLanding.mockReset();
  });

  it("prefers an explicit filter query over route-derived seo filters", async () => {
    await expect(
      resolveNavigationFilterQuery({
        us: false,
        filter: ' {"onlyCollected":true} ',
        routeFilterKind: "person",
        routeFilterSlug: "stan-lee",
      })
    ).resolves.toBe('{"onlyCollected":true}');

    expect(resolveSeoFilterLanding).not.toHaveBeenCalled();
  });

  it("resolves seo route filters through the landing lookup when no explicit filter exists", async () => {
    resolveSeoFilterLanding.mockResolvedValue({
      filterQuery: '{"individuals":[{"name":"Stan Lee","type":"WRITER"}]}',
    });

    await expect(
      resolveNavigationFilterQuery({
        us: true,
        routeFilterKind: "person",
        routeFilterSlug: "stan-lee",
      })
    ).resolves.toBe('{"individuals":[{"name":"Stan Lee","type":"WRITER"}]}');

    expect(resolveSeoFilterLanding).toHaveBeenCalledWith({
      us: true,
      kind: "person",
      slug: "stan-lee",
    });
  });

  it("returns null for unsupported or unresolvable route filters", async () => {
    resolveSeoFilterLanding.mockResolvedValue(null);

    await expect(
      resolveNavigationFilterQuery({
        us: false,
        routeFilterKind: "publisher",
        routeFilterSlug: "panini",
      })
    ).resolves.toBeNull();

    await expect(
      resolveNavigationFilterQuery({
        us: false,
        routeFilterKind: "person",
        routeFilterSlug: "",
      })
    ).resolves.toBeNull();
  });
});
