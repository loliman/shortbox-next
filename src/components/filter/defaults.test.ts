import { parseFilterValues } from "./defaults";

describe("parseFilterValues", () => {
  it("should_return_defaults_when_empty_query_string_given", () => {
    const parsed = parseFilterValues("");
    expect(parsed.publishers).toEqual([]);
    expect(parsed.firstPrint).toBe(false);
  });

  it("should_parse_flat_filter_values_correctly", () => {
    const filter = JSON.stringify({
      publishers: [{ name: "Panini" }],
      firstPrint: true,
    });
    const parsed = parseFilterValues(filter);
    expect(parsed.publishers).toEqual([{ name: "Panini" }]);
    expect(parsed.firstPrint).toBe(true);
  });

  it("should_flatten_nested_AST_filters_correctly", () => {
    const filterAST = JSON.stringify({
      operator: "and",
      operands: [
        { publishers: [{ name: "Panini" }] },
        {
          operator: "or",
          operands: [
            { series: [{ title: "Amazing Spider-Man", volume: 1 }] },
            { series: [{ title: "Spider-Man", volume: 2 }] },
          ],
        },
      ],
    });
    const parsed = parseFilterValues(filterAST);
    // Publishers should contain Panini
    expect(parsed.publishers).toEqual([{ name: "Panini" }]);
    // Series should contain both Amazing Spider-Man and Spider-Man from the disjunction
    expect(parsed.series).toContainEqual(
      expect.objectContaining({ title: "Amazing Spider-Man", volume: 1 })
    );
    expect(parsed.series).toContainEqual(
      expect.objectContaining({ title: "Spider-Man", volume: 2 })
    );
  });
});
