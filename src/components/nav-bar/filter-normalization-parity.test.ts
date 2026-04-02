import { parseFilter } from "../../components/nav-bar/listUtils";
import { parseListingFilter } from "../../util/listingQuery";

describe("filter normalization parity", () => {
  it("keeps parseFilter semantics (string-only normalization)", () => {
    expect(parseFilter('{"formats":["HC"]}')).toEqual({ formats: ["HC"] });
    expect(parseFilter('{"arcs":{"title":"A"}}')).toEqual({ arcs: { title: "A" } });
    expect(parseFilter('{"arcs":"A||B","appearances":"X||X"}')).toEqual({
      arcs: [{ title: "A" }, { title: "B" }],
      appearances: [{ name: "X" }],
    });
  });

  it("keeps parseListingFilter semantics (non-array defaults + us override)", () => {
    const result = parseListingFilter(
      {
        filter: JSON.stringify({ formats: ["HC"], us: false }),
      },
      true
    );

    expect(result).toEqual({
      formats: ["HC"],
      arcs: [],
      appearances: [],
      realities: [],
      us: true,
    });
  });
});

