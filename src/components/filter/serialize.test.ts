import { serializeFilterValues } from "./serialize";
import type { FilterValues } from "./types";

function createBaseValues(): FilterValues {
  return {
    formats: [],
    withVariants: false,
    releasedateFrom: "",
    releasedateTo: "",
    releasedateExact: "",
    publishers: [],
    series: [],
    genres: [],
    numberFrom: "",
    numberTo: "",
    numberExact: "",
    numberVariant: "",
    arcs: [],
    individuals: [],
    appearances: [],
    realities: [],
    firstPrint: false,
    notFirstPrint: false,
    onlyPrint: false,
    notOnlyPrint: false,
    onlyTb: false,
    notOnlyTb: false,
    exclusive: false,
    notExclusive: false,
    reprint: false,
    notReprint: false,
    otherOnlyTb: false,
    notOtherOnlyTb: false,
    onlyOnePrint: false,
    notOnlyOnePrint: false,
    noPrint: false,
    notNoPrint: false,
    onlyCollected: false,
    onlyNotCollected: false,
    onlyNotCollectedNoOwnedVariants: false,
    noComicguideId: false,
    noContent: false,
  };
}

describe("serializeFilterValues", () => {
  it("returns null when nothing is selected", () => {
    expect(serializeFilterValues(createBaseValues(), true)).toBeNull();
  });

  it("serializes selected values and strips transport-only metadata", () => {
    const values = createBaseValues();
    values.formats = [{ name: "HC" }];
    values.withVariants = true;
    values.releasedateFrom = "2020-01-01";
    values.publishers = [
      { __typename: "Publisher", id: 1, us: true, name: "Marvel", __resolveType: "Publisher" },
    ];
    values.series = [
      {
        __typename: "Series",
        id: 2,
        title: "Spider-Man",
        volume: 1,
        publisher: { __typename: "Publisher", id: 3, name: "Marvel", us: true },
      },
    ];
    values.genres = [{ name: "Sci-Fi" }, { name: "Fantasy" }, { name: "sci-fi" }];
    values.numberFrom = "10";
    values.arcs = [{ title: "Maximum Carnage" }, { title: "Civil War" }];
    values.individuals = [
      { __typename: "Individual", name: "Peter Parker", type: ["WRITER"], role: ["Writer"] },
    ];
    values.appearances = [{ name: "Spider-Man" }, { name: "Venom" }];
    values.realities = [{ name: "Earth-616" }, { name: "Earth-1610" }];
    values.firstPrint = true;
    values.onlyPrint = true;
    values.otherOnlyTb = true;

    const payload = serializeFilterValues(values, false);

    expect(payload).not.toBeNull();
    expect(payload).toMatchObject({
      formats: ["HC"],
      withVariants: true,
      releasedates: [{ compare: ">=", date: "2020-01-01" }],
      genres: ["Sci-Fi", "Fantasy"],
      numbers: [{ compare: ">=", number: "10", variant: "" }],
      arcs: [{ title: "Maximum Carnage" }, { title: "Civil War" }],
      appearances: [{ name: "Spider-Man" }, { name: "Venom" }],
      realities: [{ name: "Earth-616" }, { name: "Earth-1610" }],
      firstPrint: true,
      onlyPrint: true,
      otherOnlyTb: true,
      us: false,
    });

    const publisher = payload?.publishers?.[0] as Record<string, unknown>;
    expect(publisher.name).toBe("Marvel");
    expect(publisher.us).toBeUndefined();
    expect(publisher.__typename).toBeUndefined();

    const individual = payload?.individuals?.[0] as Record<string, unknown>;
    expect(individual.name).toBe("Peter Parker");
    expect(individual.role).toBeUndefined();
  });

  it("serializes exact date and exact numbers", () => {
    const values = createBaseValues();
    values.releasedateExact = "2024-11-10";
    values.numberExact = "1, 1A, Annual 1";

    const payload = serializeFilterValues(values, true);

    expect(payload).toMatchObject({
      releasedates: [{ compare: "=", date: "2024-11-10" }],
      numbers: [
        { compare: "=", number: "1", variant: "" },
        { compare: "=", number: "1A", variant: "" },
        { compare: "=", number: "Annual 1", variant: "" },
      ],
      us: true,
    });
  });

  it("serializes optional boolean flags and prioritizes positive over negated conflicts", () => {
    const values = createBaseValues();
    values.onlyTb = true;
    values.notOnlyTb = true;
    values.exclusive = true;
    values.notExclusive = true;
    values.reprint = true;
    values.notReprint = true;
    values.noPrint = true;
    values.notNoPrint = true;
    values.onlyOnePrint = true;
    values.notOnlyOnePrint = true;
    values.firstPrint = true;
    values.notFirstPrint = true;
    values.onlyPrint = true;
    values.notOnlyPrint = true;
    values.otherOnlyTb = true;
    values.notOtherOnlyTb = true;
    values.onlyCollected = true;
    values.onlyNotCollected = true;
    values.onlyNotCollectedNoOwnedVariants = true;
    values.noComicguideId = true;
    values.noContent = true;

    const payload = serializeFilterValues(values, true);

    expect(payload).toMatchObject({
      onlyTb: true,
      exclusive: true,
      reprint: true,
      noPrint: true,
      onlyOnePrint: true,
      firstPrint: true,
      onlyPrint: true,
      otherOnlyTb: true,
      onlyCollected: true,
      noComicguideId: true,
      noContent: true,
      us: true,
    });
    expect(payload).not.toHaveProperty("notOnlyTb");
    expect(payload).not.toHaveProperty("notExclusive");
    expect(payload).not.toHaveProperty("notReprint");
    expect(payload).not.toHaveProperty("notNoPrint");
    expect(payload).not.toHaveProperty("notOnlyOnePrint");
    expect(payload).not.toHaveProperty("notFirstPrint");
    expect(payload).not.toHaveProperty("notOnlyPrint");
    expect(payload).not.toHaveProperty("notOtherOnlyTb");
  });

  it("prioritizes variant-free not-collected mode over plain not-collected", () => {
    const values = createBaseValues();
    values.onlyNotCollected = true;
    values.onlyNotCollectedNoOwnedVariants = true;

    const payload = serializeFilterValues(values, true);

    expect(payload).toMatchObject({
      onlyNotCollectedNoOwnedVariants: true,
      us: true,
    });
    expect(payload).not.toHaveProperty("onlyNotCollected");
  });
});
