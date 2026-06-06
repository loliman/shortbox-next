import { seriesSortKey, compareSeriesTitle } from "./sort";

describe("seriesSortKey", () => {
  it("should lower-case the result", () => {
    expect(seriesSortKey("Batman")).toBe("batman");
  });

  it("should strip leading 'The' (case-insensitive)", () => {
    expect(seriesSortKey("The Amazing Spider-Man")).toBe("amazing spider man");
    expect(seriesSortKey("the Amazing Spider-Man")).toBe("amazing spider man");
    expect(seriesSortKey("THE Amazing Spider-Man")).toBe("amazing spider man");
  });

  it("should strip leading 'Der'", () => {
    expect(seriesSortKey("Der Spiegel")).toBe("spiegel");
  });

  it("should strip leading 'Die'", () => {
    expect(seriesSortKey("Die Fantastischen Vier")).toBe("fantastischen vier");
  });

  it("should strip leading 'Das'", () => {
    expect(seriesSortKey("Das Schwarze Auge")).toBe("schwarze auge");
  });

  it("should NOT strip non-article words that start with 'The', 'Der', etc.", () => {
    expect(seriesSortKey("Theme")).toBe("theme");
    expect(seriesSortKey("Derry")).toBe("derry");
  });

  it("should normalize ä to a", () => {
    expect(seriesSortKey("Bären")).toBe("baren");
  });

  it("should normalize ö to o", () => {
    expect(seriesSortKey("Röntgen")).toBe("rontgen");
  });

  it("should normalize ü to u", () => {
    expect(seriesSortKey("Über")).toBe("uber");
  });

  it("should normalize ß to ss", () => {
    expect(seriesSortKey("Straße")).toBe("strasse");
  });

  it("should remove punctuation", () => {
    expect(seriesSortKey("Spider-Man")).toBe("spider man");
    expect(seriesSortKey("A.B.C.")).toBe("a b c");
    expect(seriesSortKey("X-Men: Legacy")).toBe("x men legacy");
  });

  it("should handle leading article followed by punctuated title", () => {
    expect(seriesSortKey("The X-Men")).toBe("x men");
  });

  it("should trim whitespace", () => {
    expect(seriesSortKey("  Batman  ")).toBe("batman");
  });

  it("should collapse multiple spaces", () => {
    expect(seriesSortKey("Batman   Forever")).toBe("batman forever");
  });

  it("should handle empty string", () => {
    expect(seriesSortKey("")).toBe("");
  });
});

describe("compareSeriesTitle", () => {
  it("should sort alphabetically ignoring articles", () => {
    const titles = ["The Amazing Spider-Man", "Batman", "The X-Men", "Action Comics"];
    const sorted = [...titles].sort(compareSeriesTitle);
    expect(sorted).toEqual(["Action Comics", "The Amazing Spider-Man", "Batman", "The X-Men"]);
  });

  it("should sort umlauts as their base letters", () => {
    const titles = ["Über die Grenze", "Unter dem Meer", "Äpfel"];
    const sorted = [...titles].sort(compareSeriesTitle);
    expect(sorted).toEqual(["Äpfel", "Über die Grenze", "Unter dem Meer"]);
  });

  it("should ignore punctuation for sort order", () => {
    const titles = ["X-Men", "Xanadu", "X.O. Manowar"];
    const sorted = [...titles].sort(compareSeriesTitle);
    // sort keys: "x men", "xanadu", "x o manowar"
    // "x men" < "x o manowar" < "xanadu"
    expect(sorted).toEqual(["X-Men", "X.O. Manowar", "Xanadu"]);
  });

  it("should sort articles away correctly", () => {
    const titles = ["Die Fantastischen Vier", "Der Spiegel", "Das Schwarze Auge", "Action Comics"];
    const sorted = [...titles].sort(compareSeriesTitle);
    // After stripping articles: "fantastischen vier", "spiegel", "schwarze auge", "action comics"
    // Alphabetically: action < fantastischen < schwarze < spiegel
    expect(sorted).toEqual([
      "Action Comics",
      "Die Fantastischen Vier",
      "Das Schwarze Auge",
      "Der Spiegel",
    ]);
  });
});
