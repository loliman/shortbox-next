import { describe, expect, it } from "vitest";
import { createDefaultFilterValues, parseFilterValues } from "./defaults";

describe("filter defaults", () => {
  it("creates stable default filter values", () => {
    const defaults = createDefaultFilterValues();
    expect(defaults.formats).toEqual([]);
    expect(defaults.releasedateFrom).toBe("");
    expect(defaults.releasedateTo).toBe("");
    expect(defaults.releasedateExact).toBe("");
    expect(defaults.numberFrom).toBe("");
    expect(defaults.numberTo).toBe("");
    expect(defaults.numberExact).toBe("");
    expect(defaults.numberVariant).toBe("");
    expect(defaults.genres).toEqual([]);
    expect(defaults.arcs).toEqual([]);
    expect(defaults.appearances).toEqual([]);
    expect(defaults.realities).toEqual([]);
    expect(defaults.withVariants).toBe(false);
    expect(defaults.onlyNotCollectedNoOwnedVariants).toBe(false);
  });

  it("parses query filter and normalizes list fields", () => {
    const parsed = parseFilterValues(
      JSON.stringify({
        formats: ["Heft", { name: "Taschenbuch" }, { foo: "bar" }],
        releasedates: [
          { compare: ">=", date: "2020-01-01" },
          { compare: "<=", date: "2022-12-31" },
        ],
        publishers: [{ name: "Marvel" }],
        series: [{ title: "Spider-Man" }, null, 42],
        genres: ["Sci-Fi", { name: "Fantasy" }, "sci-fi", ""],
        numbers: [
          { compare: ">=", number: "10" },
          { compare: "<=", number: "25", variant: "A" },
        ],
        individuals: [{ name: "Peter" }],
        arcs: "Civil War || Secret Invasion",
        appearances: "Venom || Symbiote",
        realities: "Earth-616 || Earth-1610",
        withVariants: 1,
        firstPrint: true,
      })
    );

    expect(parsed.formats).toEqual([{ name: "Heft" }, { name: "Taschenbuch" }]);
    expect(parsed.series).toEqual([{ title: "Spider-Man", __typename: "Series" }]);
    expect(parsed.publishers).toEqual([{ name: "Marvel" }]);
    expect(parsed.genres).toEqual([{ name: "Sci-Fi" }, { name: "Fantasy" }]);
    expect(parsed.releasedateFrom).toBe("2020-01-01");
    expect(parsed.releasedateTo).toBe("2022-12-31");
    expect(parsed.numberFrom).toBe("10");
    expect(parsed.numberTo).toBe("25");
    expect(parsed.numberVariant).toBe("A");
    expect(parsed.arcs).toEqual([{ title: "Civil War" }, { title: "Secret Invasion" }]);
    expect(parsed.appearances).toEqual([{ name: "Venom" }, { name: "Symbiote" }]);
    expect(parsed.realities).toEqual([{ name: "Earth-616" }, { name: "Earth-1610" }]);
    expect(parsed.withVariants).toBe(true);
    expect(parsed.firstPrint).toBe(true);
  });

  it("falls back to defaults on missing/invalid filters", () => {
    expect(parseFilterValues()).toEqual(createDefaultFilterValues());
    expect(parseFilterValues("not-json")).toEqual(createDefaultFilterValues());
  });

  it("enforces collection mode exclusivity while parsing", () => {
    const parsed = parseFilterValues(
      JSON.stringify({
        onlyCollected: true,
        onlyNotCollected: true,
        onlyNotCollectedNoOwnedVariants: true,
      })
    );

    expect(parsed.onlyCollected).toBe(true);
    expect(parsed.onlyNotCollected).toBe(false);
    expect(parsed.onlyNotCollectedNoOwnedVariants).toBe(false);
  });

  it("enforces negated contains switch exclusivity while parsing", () => {
    const parsed = parseFilterValues(
      JSON.stringify({
        reprint: true,
        notReprint: true,
      })
    );

    expect(parsed.reprint).toBe(true);
    expect(parsed.notReprint).toBe(false);
  });
});
