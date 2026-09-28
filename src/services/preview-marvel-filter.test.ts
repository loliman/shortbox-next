import { classifyDraftForMarvelScope, isMarvelScopeDraft } from "./preview-marvel-filter";

describe("preview-marvel-filter", () => {
  it("should_classifyAsMarvel_when_spiderManOrAvengersDraftProvided", () => {
    const draft = {
      sourceTitle: "SPIDER-MAN 11",
      issueCode: "DAMSM011",
      values: {
        title: "Spider-Man",
        series: { title: "Spider-Man (2025)", volume: 1, publisher: { name: "Panini - Marvel & Icon", us: false } },
        number: "11",
        variant: "",
        format: "Heft",
        releasedate: "2026-10-13",
        individuals: [],
        addinfo: "",
        stories: [{ parent: { issue: { series: { title: "Amazing Spider-Man (2025)" } } } }],
        copyBatch: { enabled: false, count: 1, prefix: "" },
      },
    };

    const res = classifyDraftForMarvelScope(draft as any);
    expect(res.inScope).toBe(true);
    expect(res.category).toBe("marvel");
    expect(isMarvelScopeDraft(draft as any)).toBe(true);
  });

  it("should_classifyAsStarWars_when_darthVaderOrStarWarsDraftProvided", () => {
    const draft = {
      sourceTitle: "STAR WARS 135: SHADOW OF MAUL",
      issueCode: "YDSTWC135",
      values: {
        title: "Star Wars",
        series: { title: "Star Wars", volume: 1, publisher: { name: "Panini - Star Wars", us: false } },
        number: "135",
        variant: "",
        format: "Heft",
        releasedate: "2026-10-20",
        individuals: [],
        addinfo: "",
        stories: [{ parent: { issue: { series: { title: "Star Wars: Galaxy's Edge" } } } }],
        copyBatch: { enabled: false, count: 1, prefix: "" },
      },
    };

    const res = classifyDraftForMarvelScope(draft as any);
    expect(res.inScope).toBe(true);
    expect(res.category).toBe("star_wars");
  });

  it("should_classifyAsAlienPredator_when_predatorVersusMarvelDraftProvided", () => {
    const draft = {
      sourceTitle: "PREDATOR KILLT DAS MARVEL-UNIVERSUM",
      issueCode: "DPREDA001",
      values: {
        title: "Predator killt das Marvel-Universum",
        series: { title: "Predator", volume: 1, publisher: { name: "Panini - Marvel & Icon", us: false } },
        number: "1",
        variant: "",
        format: "Softcover",
        releasedate: "2026-11-17",
        individuals: [],
        addinfo: "",
        stories: [],
        copyBatch: { enabled: false, count: 1, prefix: "" },
      },
    };

    const res = classifyDraftForMarvelScope(draft as any);
    expect(res.inScope).toBe(true);
    expect(res.category).toBe("alien_predator");
  });

  it("should_classifyAsCrossover_when_jlaAvengersOrGodzillaDraftProvided", () => {
    const draft = {
      sourceTitle: "JLA/AVENGERS",
      issueCode: "DOSDC122",
      values: {
        title: "JLA/Avengers",
        series: { title: "JLA/Avengers", volume: 1, publisher: { name: "Panini", us: false } },
        number: "1",
        variant: "",
        format: "Softcover",
        releasedate: "2026-11-24",
        individuals: [],
        addinfo: "",
        stories: [{ parent: { issue: { series: { title: "JLA/Avengers" } } } }],
        copyBatch: { enabled: false, count: 1, prefix: "" },
      },
    };

    const res = classifyDraftForMarvelScope(draft as any);
    expect(res.inScope).toBe(true);
    expect(res.category).toBe("crossover");
  });

  it("should_classifyAsMarvelManga_when_octoGirlProvided", () => {
    const draft = {
      sourceTitle: "SPIDER-MAN OCTO-GIRL 3",
      issueCode: "DOCTOM003",
      values: {
        title: "Spider-Man Octo-Girl",
        series: { title: "Spider-Man Octo-Girl", volume: 1, publisher: { name: "Planet Manga", us: false } },
        number: "3",
        variant: "",
        format: "Softcover",
        releasedate: "2026-10-20",
        individuals: [],
        addinfo: "",
        stories: [],
        copyBatch: { enabled: false, count: 1, prefix: "" },
      },
    };

    const res = classifyDraftForMarvelScope(draft as any);
    expect(res.inScope).toBe(true);
    expect(res.category).toBe("marvel_manga");
  });

  it("should_excludeAsOther_when_pureDcBatmanProvided", () => {
    const draft = {
      sourceTitle: "ABSOLUTE BATMAN 6",
      issueCode: "DABSBA006",
      values: {
        title: "Absolute Batman",
        series: { title: "Absolute Batman", volume: 1, publisher: { name: "Panini - DC", us: false } },
        number: "6",
        variant: "",
        format: "Softcover",
        releasedate: "2026-10-06",
        individuals: [],
        addinfo: "",
        stories: [{ parent: { issue: { series: { title: "Absolute Batman" } } } }],
        copyBatch: { enabled: false, count: 1, prefix: "" },
      },
    };

    const res = classifyDraftForMarvelScope(draft as any);
    expect(res.inScope).toBe(false);
    expect(res.category).toBe("other");
  });

  it("should_excludeAsOther_when_genericNonMarvelMangaProvided", () => {
    const draft = {
      sourceTitle: "BERSERK MASTER EDITION 8",
      issueCode: "DBERME008",
      values: {
        title: "Berserk Master Edition",
        series: { title: "Berserk Master Edition", volume: 1, publisher: { name: "Planet Manga", us: false } },
        number: "8",
        variant: "",
        format: "Hardcover",
        releasedate: "2026-12-15",
        individuals: [],
        addinfo: "",
        stories: [],
        copyBatch: { enabled: false, count: 1, prefix: "" },
      },
    };

    const res = classifyDraftForMarvelScope(draft as any);
    expect(res.inScope).toBe(false);
    expect(res.category).toBe("other");
  });

  it("should_excludeAsOther_when_nonComicMagazinOrCookbookOrNovelProvided", () => {
    const magazin = {
      sourceTitle: "DAS OFFIZIELLE STAR WARS MAGAZIN 426",
      issueCode: "YDOSWM00426",
      values: { title: "Das Offizielle Star Wars Magazin" },
    };
    expect(classifyDraftForMarvelScope(magazin as any).inScope).toBe(false);

    const kochbuch = {
      sourceTitle: "Star Wars: Rezepte, inspiriert von...",
      issueCode: "YDSWWC010",
      values: { title: "Star Wars: Rezepte" },
    };
    expect(classifyDraftForMarvelScope(kochbuch as any).inScope).toBe(false);

    const roman = {
      sourceTitle: "Star Wars: Augen wie Sterne",
      issueCode: "YDSWYA012",
      values: { title: "Augen wie Sterne" },
    };
    expect(classifyDraftForMarvelScope(roman as any).inScope).toBe(false);
  });

  it("should_excludeAsOther_when_mangaWithDmaOrDpokPrefixProvided", () => {
    const mushoku = {
      sourceTitle: "Mushoku Tensei 12",
      issueCode: "DMAGM012",
      values: { title: "Mushoku Tensei" },
    };
    expect(classifyDraftForMarvelScope(mushoku as any).inScope).toBe(false);

    const pokemon = {
      sourceTitle: "Pokémon Karmesin und Purpur",
      issueCode: "DPOKAM012",
      values: { title: "Pokémon" },
    };
    expect(classifyDraftForMarvelScope(pokemon as any).inScope).toBe(false);
  });
});
