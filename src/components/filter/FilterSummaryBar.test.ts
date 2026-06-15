import { buildFilterLabels } from "./FilterSummaryBar";

describe("buildFilterLabels", () => {
  it("should_return_empty_array_when_no_filter_is_provided", () => {
    expect(buildFilterLabels(null)).toEqual([]);
    expect(buildFilterLabels(undefined)).toEqual([]);
    expect(buildFilterLabels("")).toEqual([]);
    expect(buildFilterLabels("{}")).toEqual([]);
  });

  it("should_return_labels_for_original_boolean_filters", () => {
    const filter = JSON.stringify({
      onlyCollected: true,
      onlyNotCollected: true,
    });
    expect(buildFilterLabels(filter)).toEqual([
      "Nur in Sammlung",
      "Nur nicht in Sammlung",
    ]);
  });

  it("should_return_labels_for_newly_added_filter_switches", () => {
    const filter = JSON.stringify({
      onlyIssuesWithMultipleCollectedVariants: true,
      onlyNeededIssues: true,
      onlyIncompleteSeries: true,
      onlyUnownedFirstPrints: true,
      onlyNewUsMaterial: true,
      onlySellingList: true,
      onlyFirstOfMonthRelease: true,
    });
    expect(buildFilterLabels(filter)).toEqual([
      "Mehr als eine Variante gesammelt",
      "Welche Ausgaben brauche ich noch?",
      "Unvollständige Serien",
      "Erstausgaben, die ich nicht besitze",
      "US-Material ab Startjahr 2025",
      "Verkaufsliste",
      "Erschienen am 01. des Monats",
    ]);
  });

  it("should_return_labels_for_negated_filter_switches", () => {
    const filter = JSON.stringify({
      notFirstPrint: true,
      notOnlyPrint: true,
      notOnlyTb: true,
      notExclusive: true,
      notReprint: true,
      notOtherOnlyTb: true,
      notOnlyOnePrint: true,
      notNoPrint: true,
    });
    expect(buildFilterLabels(filter)).toEqual([
      "Keine Erstveröffentlichung",
      "Keine einzige Veröffentlichung",
      "Nicht nur in Taschenbuch",
      "Kein exklusiver Inhalt",
      "Kein reiner Nachdruck",
      "Nicht sonst nur in Taschenbuch",
      "Nicht nur einfach auf deutsch erschienen",
      "Auf deutsch erschienen",
    ]);
  });

  it("should_return_correct_cross_exclusive_label_for_de_context", () => {
    const filter = JSON.stringify({
      crossExclusive: true,
    });
    expect(buildFilterLabels(filter, false)).toEqual([
      "Nur exakt dieses US-Material",
    ]);
  });

  it("should_return_correct_cross_exclusive_label_for_us_context", () => {
    const filter = JSON.stringify({
      crossExclusive: true,
    });
    expect(buildFilterLabels(filter, true)).toEqual([
      "Nur exakt dieses deutsche Material",
    ]);
  });

  it("should_return_correct_label_for_complex_filter", () => {
    const filter = JSON.stringify({
      formats: ["Heft"],
      withVariants: true,
      crossExclusive: true,
      genres: ["Superhero"],
      realities: [{ name: "Earth-616" }],
    });
    expect(buildFilterLabels(filter, false)).toEqual([
      "Format: Heft",
      "Mit Varianten",
      "Genre: Superhero",
      "Nur exakt dieses US-Material",
      "Realität: Earth-616",
    ]);
  });
});
