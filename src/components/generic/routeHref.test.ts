import { buildRouteHref } from "./routeHref";

describe("buildRouteHref", () => {
  it("should keep filter when navigating within the same namespace", () => {
    const filter = JSON.stringify({ onlyCollected: true, us: false });
    const currentQuery = { filter };

    // Navigate DE -> DE
    const resultDe = buildRouteHref("/de/marvel/avengers", currentQuery);
    expect(resultDe).toContain("filter=");
    expect(resultDe).toContain("us%22%3Afalse");

    // Navigate US -> US
    const usFilter = JSON.stringify({ onlyCollected: true, us: true });
    const usQuery = { filter: usFilter };
    const resultUs = buildRouteHref("/us/marvel/avengers", usQuery);
    expect(resultUs).toContain("filter=");
    expect(resultUs).toContain("us%22%3Atrue");
  });

  it("should clear filter when navigating from DE to US", () => {
    const filter = JSON.stringify({ onlyCollected: true, us: false });
    const currentQuery = { filter };

    // Navigate DE -> US
    const result = buildRouteHref("/us/marvel/avengers", currentQuery);
    expect(result).not.toContain("filter=");
  });

  it("should clear filter when navigating from US to DE", () => {
    const filter = JSON.stringify({ onlyCollected: true, us: true });
    const currentQuery = { filter };

    // Navigate US -> DE
    const result = buildRouteHref("/de/marvel/avengers", currentQuery);
    expect(result).not.toContain("filter=");
  });

  it("should clear transient query keys", () => {
    const currentQuery = { expand: "1", from: "somewhere", filter: "somefilter" };
    const result = buildRouteHref("/de", currentQuery);
    expect(result).not.toContain("expand=");
    expect(result).not.toContain("from=");
  });
});
