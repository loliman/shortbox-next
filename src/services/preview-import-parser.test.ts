import type { PdfLayoutDocument } from "../types/pdf-layout";
import { parsePreviewImportQueue } from "./preview-import-parser";

describe("parsePreviewImportQueue", () => {
  it("should_ignore_non_neuheiten_pages_and_parse_issue_variants_when_confirmed_preview_rules_apply", async () => {
    const text = [
      [
        "I N H A L T",
        "SUPERGIRL 1",
        "DSGIRL001",
      ].join("\n"),
      [
        "9",
        "N E U H E I T E N",
        "N E U E N E U E",
        "SUPERGIRL 1",
        "SERIE SERIE",
        "Story | Zeichnungen: Sophie Campbell",
        "Inhalt: Supergirl 1-3",
        "Supergirls fantastische",
        "neue Abenteuer!",
        "Variant-Cover",
        "76 S. | Softcover | € 9,99",
        "DSGIRL001",
        "28.04.2026",
        "auf 300 Ex. lim. SC I € 13,-",
        "DSGIRL001V",
        "28.04.2026",
        "© & ™ DC.",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async (title: string) =>
          title === "Supergirl"
            ? [{ title: "Supergirl", volume: 1, publisherName: "Panini" }]
            : [],
      },
    });

    expect(queue.drafts).toHaveLength(2);

    const [mainDraft, variantDraft] = queue.drafts;

    expect(mainDraft.sourceTitle).toBe("Supergirl 1");
    expect(mainDraft.issueCode).toBe("DSGIRL001");
    expect(mainDraft.values.series.title).toBe("Supergirl");
    expect(mainDraft.values.series.volume).toBe(1);
    expect(mainDraft.values.number).toBe("1");
    expect(mainDraft.values.variant).toBe("");
    expect(mainDraft.values.pages).toBe(76);
    expect(mainDraft.values.format).toBe("Softcover");
    expect(mainDraft.values.price).toBe("9.99");
    expect(mainDraft.values.releasedate).toBe("2026-04-28");
    expect(mainDraft.values.stories).toHaveLength(3);

    expect(variantDraft.issueCode).toBe("DSGIRL001V");
    expect(variantDraft.variantOfDraftId).toBe(mainDraft.id);
    expect(variantDraft.values.variant).toBe("A");
    expect(variantDraft.values.limitation).toBe("300");
    expect(variantDraft.values.pages).toBe(76);
    expect(variantDraft.values.format).toBe("Softcover");
    expect(variantDraft.values.price).toBe("13");
    expect(variantDraft.values.releasedate).toBe("2026-04-28");
    expect(variantDraft.values.stories).toHaveLength(0);
  });

  it("should_create_one_draft_per_product_code_for_grouped_issue_blocks", async () => {
    const text = [
      [
        "24",
        "N E U H E I T E N",
        "Variant-Cover",
        "Nr. 28 Nr. 29",
        "Nr.28",
        "333 Ex. | € 9,-",
        "DNAVE028V",
        "Comic-Salon Erlangen",
        "52 S. | Heft | € 5,99 52 S. | Heft | € 5,99",
        "DNAVE028 DNAVE029",
        "12.05.2026 09.06.2026",
        "Nr. 27",
        "52 S. | Heft | € 5,99",
        "DNAVE027",
        "07.04.2026",
        "AVENGERS 27 + 28 + 29",
        "Inhalt: New Avengers 2-3 (Nr. 27); Avengers 29, New Avengers 4 (Nr. 28); Avengers 30, New Avengers 5 (Nr. 29)",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [{ title: "Avengers", volume: 1, publisherName: "Panini" }],
      },
    });

    const byCode = new Map(queue.drafts.map((draft) => [draft.issueCode, draft]));

    expect(byCode.get("DNAVE027")?.values.series.title).toBe("Avengers");
    expect(byCode.get("DNAVE027")?.values.number).toBe("27");
    expect(byCode.get("DNAVE027")?.values.price).toBe("5.99");
    expect(byCode.get("DNAVE027")?.values.releasedate).toBe("2026-04-07");

    expect(byCode.get("DNAVE028")?.values.series.title).toBe("Avengers");
    expect(byCode.get("DNAVE028")?.values.number).toBe("28");
    expect(byCode.get("DNAVE028")?.values.releasedate).toBe("2026-05-12");
    expect(byCode.get("DNAVE028")?.values.stories).toHaveLength(2);

    expect(byCode.get("DNAVE029")?.values.series.title).toBe("Avengers");
    expect(byCode.get("DNAVE029")?.values.number).toBe("29");
    expect(byCode.get("DNAVE029")?.values.releasedate).toBe("2026-06-09");
    expect(byCode.get("DNAVE029")?.values.stories).toHaveLength(2);

    expect(byCode.get("DNAVE028V")?.values.number).toBe("28");
    expect(byCode.get("DNAVE028V")?.values.variant).toBe("A");
    expect(byCode.get("DNAVE028V")?.variantOfDraftId).toBe(byCode.get("DNAVE028")?.id);
    expect(byCode.get("DNAVE028V")?.values.limitation).toBe("333");
  });

  it("should_expand_multi_issue_story_lists_for_anthology_content", async () => {
    const text = [
      [
        "30",
        "N E U H E I T E N",
        "SPIDER-MAN-",
        "ANTHOLOGIE",
        "(NEUAUSGABE)",
        "Story: Stan Lee",
        "Inhalt: Amazing Fantasy 15, Amazing Spider-Man 2,",
        "50, 100-102, 300, 500, Annual 21, Amazing Spider-",
        "Man (1999) 38, Spectacular Spider-Man 200, Amazing",
        "Spider-Man (2025) 1",
        "364 S. | Hardcover | € 35,-",
        "DMAANT012",
        "09.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    expect(queue.drafts).toHaveLength(1);
    expect(queue.drafts[0]?.values.series.title).toBe("Spider-Man Anthologie");
    expect(queue.drafts[0]?.values.title).toBe("Neuausgabe");
    expect(queue.drafts[0]?.values.number).toBe("1");
    expect(
      queue.drafts[0]?.values.stories.map((story) => ({
        series: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.series?.title,
        number: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.number,
      }))
    ).toEqual([
      { series: "Amazing Fantasy", number: "15" },
      { series: "Amazing Spider-Man", number: "2" },
      { series: "Amazing Spider-Man", number: "50" },
      { series: "Amazing Spider-Man", number: "100" },
      { series: "Amazing Spider-Man", number: "101" },
      { series: "Amazing Spider-Man", number: "102" },
      { series: "Amazing Spider-Man", number: "300" },
      { series: "Amazing Spider-Man", number: "500" },
      { series: "Annual", number: "21" },
      { series: "Amazing Spider-Man", number: "38" },
      { series: "Spectacular Spider-Man", number: "200" },
      { series: "Amazing Spider-Man", number: "1" },
    ]);
  });

  it("should_split_must_have_collection_prefixes_into_series_and_title", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "DC MUST-HAVE: BATMAN &",
        "SUPERMAN: SUPERGIRL",
        "Inhalt: Superman/Batman 8-13",
        "172 S. | Hardcover | € 27,-",
        "DDCMUS010",
        "26.05.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    expect(queue.drafts).toHaveLength(1);
    expect(queue.drafts[0]?.values.series.title).toBe("DC Must-Have");
    expect(queue.drafts[0]?.values.title).toBe("Batman & Superman: Supergirl");
    expect(queue.drafts[0]?.values.number).toBe("1");
  });

  it("should_use_layout_titles_for_grouped_top_full_width_issue_blocks_without_content_rows", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "DSTRAP001",
        "DSTRAP002",
        "DSTRAP001V",
        "JAADUGAR: EINE HEXE",
        "IN DER MONGOLEI 1",
        "GORGONIA - VON MYTHEN,",
        "GÖTTERN UND SCHICKSAL",
      ].join("\n"),
    ].join("\n\n");

    const layout: PdfLayoutDocument = {
      pages: [
        {
          pageNumber: 65,
          width: 567,
          height: 794,
          items: [],
          rows: [
            { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
            { text: "STRANGE PICTURES - SELTSAME BILDER 1 + 2", items: [], xMin: 55, xMax: 441, y: 713, height: 11 },
            { text: "Story: Uketsu | Zeichnungen: Kikou Aiba", items: [], xMin: 55, xMax: 220, y: 696, height: 11 },
            { text: "DSTRAP001 164 S. | SC, sw | € 8,99 21.04.2026", items: [], xMin: 64, xMax: 269, y: 437, height: 11 },
            { text: "DSTRAP002 164 S. | SC, sw | € 8,99 16.06.2026", items: [], xMin: 322, xMax: 527, y: 417, height: 11 },
            { text: "DSTRAP001V 164 S. | SC, sw | € 13,- MCC 2026", items: [], xMin: 62, xMax: 268, y: 417, height: 11 },
            { text: "JAADUGAR: EINE HEXE", items: [], xMin: 55, xMax: 190, y: 300, height: 11 },
            { text: "IN DER MONGOLEI 1", items: [], xMin: 55, xMax: 195, y: 276, height: 11 },
            { text: "GORGONIA - VON MYTHEN,", items: [], xMin: 322, xMax: 500, y: 300, height: 11 },
            { text: "GÖTTERN UND SCHICKSAL", items: [], xMin: 322, xMax: 510, y: 276, height: 11 },
          ],
          blocks: [
            { text: "DSTRAP001 164 S. | SC, sw | € 8,99 21.04.2026", rows: [], xMin: 64, xMax: 269, yTop: 442, yBottom: 432 },
            { text: "DSTRAP002 164 S. | SC, sw | € 8,99 16.06.2026", rows: [], xMin: 322, xMax: 527, yTop: 422, yBottom: 412 },
            { text: "DSTRAP001V 164 S. | SC, sw | € 13,- MCC 2026", rows: [], xMin: 62, xMax: 268, yTop: 422, yBottom: 412 },
          ],
        },
      ],
    };

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      layout,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const byCode = new Map(queue.drafts.map((draft) => [draft.issueCode, draft]));

    expect(byCode.get("DSTRAP001")?.sourceTitle).toBe("Strange Pictures - Seltsame Bilder 1");
    expect(byCode.get("DSTRAP001")?.values.series.title).toBe("Strange Pictures - Seltsame Bilder");
    expect(byCode.get("DSTRAP001")?.values.number).toBe("1");
    expect(byCode.get("DSTRAP002")?.sourceTitle).toBe("Strange Pictures - Seltsame Bilder 2");
    expect(byCode.get("DSTRAP002")?.values.series.title).toBe("Strange Pictures - Seltsame Bilder");
    expect(byCode.get("DSTRAP002")?.values.number).toBe("2");
    expect(byCode.get("DSTRAP001V")?.values.variant).toBe("A");
    expect(byCode.get("DSTRAP001V")?.variantOfDraftId).toBe(byCode.get("DSTRAP001")?.id);
  });

  it("should_order_queue_drafts_by_pdf_appearance_instead_of_parser_source_order", async () => {
    const text = [
      [
        "5",
        "N E U H E I T E N",
        "BATMAN 109 + 110 + 111",
        "Inhalt: Detective Comics 1103, Robin and Batman: Jason Todd 1 (Nr. 109)",
        "76 S. | Heft | € 6,99",
        "DBATMA109",
        "07.04.2026",
      ].join("\n"),
      [
        "6",
        "N E U H E I T E N",
        "ABSOLUTE SUPERMAN 4",
        "Inhalt: Absolute Superman 10-12",
        "84 S. | Softcover | € 9,99",
        "DABSSM004",
        "05.05.2026",
      ].join("\n"),
    ].join("\n\n");

    const layout: PdfLayoutDocument = {
      pages: [
        {
          pageNumber: 6,
          width: 567,
          height: 794,
          items: [],
          rows: [
            { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
            { text: "ABSOLUTE SUPERMAN 4", items: [], xMin: 55, xMax: 230, y: 713, height: 20 },
            { text: "Inhalt: Absolute Superman 10-12", items: [], xMin: 55, xMax: 250, y: 660, height: 11 },
            { text: "DABSSM004 84 S. | Softcover | € 9,99 05.05.2026", items: [], xMin: 64, xMax: 300, y: 437, height: 11 },
          ],
          blocks: [
            {
              text: "DABSSM004 84 S. | Softcover | € 9,99 05.05.2026",
              rows: [],
              xMin: 64,
              xMax: 300,
              yTop: 442,
              yBottom: 432,
            },
          ],
        },
      ],
    };

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      layout,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    expect(queue.drafts[0]?.issueCode).toBe("DBATMA109");
    expect(queue.drafts[1]?.issueCode).toBe("DABSSM004");
  });

  it("should_use_multirow_layout_titles_without_content_for_lower_column_products", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "DWITCHL001",
        "DGORGO001",
      ].join("\n"),
    ].join("\n\n");

    const layout: PdfLayoutDocument = {
      pages: [
        {
          pageNumber: 65,
          width: 567,
          height: 794,
          items: [],
          rows: [
            { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
            { text: "DWITCHL001 196 S. | SC, sw | € 12,- 16.06.2026", items: [], xMin: 64, xMax: 269, y: 54, height: 11 },
            { text: "DGORGO001 420 S. | SC, farbig | € 20,- 16.06.2026", items: [], xMin: 322, xMax: 527, y: 54, height: 11 },
            { text: "JAADUGAR: EINE HEXE", items: [], xMin: 55, xMax: 246, y: 349, height: 11 },
            { text: "IN DER MONGOLEI 1", items: [], xMin: 55, xMax: 218, y: 325, height: 11 },
            { text: "GORGONIA - VON MYTHEN,", items: [], xMin: 313, xMax: 538, y: 349, height: 11 },
            { text: "GÖTTERN UND SCHICKSAL", items: [], xMin: 313, xMax: 533, y: 325, height: 11 },
          ],
          blocks: [
            { text: "DWITCHL001 196 S. | SC, sw | € 12,- 16.06.2026", rows: [], xMin: 64, xMax: 269, yTop: 59, yBottom: 47 },
            { text: "DGORGO001 420 S. | SC, farbig | € 20,- 16.06.2026", rows: [], xMin: 322, xMax: 527, yTop: 59, yBottom: 48 },
          ],
        },
      ],
    };

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      layout,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const byCode = new Map(queue.drafts.map((draft) => [draft.issueCode, draft]));

    expect(byCode.get("DWITCHL001")?.sourceTitle).toBe("Jaadugar: Eine Hexe In Der Mongolei 1");
    expect(byCode.get("DWITCHL001")?.values.series.title).toBe("Jaadugar: Eine Hexe In Der Mongolei");
    expect(byCode.get("DWITCHL001")?.values.number).toBe("1");
    expect(byCode.get("DGORGO001")?.sourceTitle).toBe("Gorgonia - Von Mythen, Göttern Und Schicksal");
    expect(byCode.get("DGORGO001")?.values.series.title).toBe("Gorgonia - Von Mythen, Göttern Und Schicksal");
    expect(byCode.get("DGORGO001")?.values.number).toBe("1");
  });

  it("should_discard_decorative_letter_wall_rows_from_layout_titles", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "VENOM: SCHWARZ,",
        "WEISS & BLUT",
        "DOSMA371V",
      ].join("\n"),
    ].join("\n\n");

    const layout: PdfLayoutDocument = {
      pages: [
        {
          pageNumber: 37,
          width: 567,
          height: 794,
          items: [],
          rows: [
            { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
            { text: "VENOM: SCHWARZ,", items: [], xMin: 60, xMax: 220, y: 713, height: 11 },
            { text: "WEISS & BLUT", items: [], xMin: 60, xMax: 190, y: 689, height: 11 },
            {
              text: "S S S S S S S S S S S S S S S S S S S S C C C C C C C C C C C C C C C C C C C C H H H H H H H H H H H H H H H H H H H H W W W W W W W W W W W W W W W W W W W W A A A A A A A A A A A A A A A A A A A A R R R R R R R R R R R R R R R R R R R R Z Z Z Z Z Z Z Z Z Z Z Z Z Z Z Z Z Z Z Z",
              items: [],
              xMin: 60,
              xMax: 520,
              y: 620,
              height: 11,
            },
            { text: "Inhalt: Venom: Black, White & Blood 1-4", items: [], xMin: 60, xMax: 300, y: 650, height: 11 },
            { text: "DOSMA371V auf 333 Ex. lim. HC | € 34,- 31.03.2026", items: [], xMin: 72, xMax: 277, y: 418, height: 11 },
          ],
          blocks: [
            { text: "DOSMA371V auf 333 Ex. lim. HC | € 34,- 31.03.2026", rows: [], xMin: 72, xMax: 277, yTop: 423, yBottom: 412 },
          ],
        },
      ],
    };

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      layout,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    expect(queue.drafts[0]?.sourceTitle).toBe("Venom: Schwarz, Weiss & Blut");
    expect(queue.drafts[0]?.values.series.title).toBe("Venom: Schwarz, Weiss & Blut");
  });

  it("should_split_dc_events_collection_prefixes_into_series_and_title", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "DC EVENTS: ZERO HOUR",
        "Inhalt: Zero Hour 0-4",
        "244 S. | Hardcover | € 29,-",
        "DDCEVT001",
        "26.05.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    expect(queue.drafts).toHaveLength(1);
    expect(queue.drafts[0]?.values.series.title).toBe("DC Events");
    expect(queue.drafts[0]?.values.title).toBe("Zero Hour");
    expect(queue.drafts[0]?.values.number).toBe("1");
  });

  it("should_split_marvel_events_collection_prefixes_into_series_and_title", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "MARVEL EVENTS: SHADOWLAND",
        "Inhalt: Shadowland 1-5",
        "244 S. | Hardcover | € 29,-",
        "DMAEV008",
        "26.05.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    expect(queue.drafts).toHaveLength(1);
    expect(queue.drafts[0]?.values.series.title).toBe("Marvel Events");
    expect(queue.drafts[0]?.values.title).toBe("Shadowland");
    expect(queue.drafts[0]?.values.number).toBe("1");
  });

  it("should_trim_spurious_trailing_issue_numbers_from_collection_titles", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "MARVEL EVENTS: INFINITY 1",
        "Inhalt: Infinity 1-6",
        "244 S. | Hardcover | € 29,-",
        "DMAEV012",
        "26.05.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    expect(queue.drafts).toHaveLength(1);
    expect(queue.drafts[0]?.values.series.title).toBe("Marvel Events");
    expect(queue.drafts[0]?.values.title).toBe("Infinity");
    expect(queue.drafts[0]?.values.number).toBe("1");
  });

  it("should_prefer_colored_layout_title_runs_for_collection_prefix_pages", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "DC MUST-HAVE: BATMAN &",
        "SUPERMAN: SUPERGIRL",
        "Inhalt: Superman/Batman 8-13",
        "172 S. | Hardcover | € 27,-",
        "DDCMUS010",
        "26.05.2026",
      ].join("\n"),
    ].join("\n\n");
    const layout: PdfLayoutDocument = {
      pages: [
        {
          pageNumber: 21,
          width: 567,
          height: 794,
          items: [],
          rows: [
            { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
            {
              text: "DC MUST-HAVE: BATMAN &",
              items: [
                { text: "DC MUST-HAVE:", x: 60, y: 720, width: 110, height: 11, fillColor: "#000000" },
                { text: "BATMAN &", x: 176, y: 720, width: 78, height: 11, fillColor: "#0097d8" },
              ],
              xMin: 60,
              xMax: 254,
              y: 720,
              height: 11,
            },
            {
              text: "SUPERMAN: SUPERGIRL",
              items: [
                { text: "SUPERMAN:", x: 176, y: 696, width: 88, height: 11, fillColor: "#0097d8" },
                { text: "SUPERGIRL", x: 270, y: 696, width: 74, height: 11, fillColor: "#0097d8" },
              ],
              xMin: 176,
              xMax: 344,
              y: 696,
              height: 11,
            },
            {
              text: "Inhalt: Superman/Batman 8-13",
              items: [],
              xMin: 60,
              xMax: 300,
              y: 650,
              height: 11,
            },
            {
              text: "DDCMUS010 172 S. | Hardcover | € 27,- 26.05.2026",
              items: [],
              xMin: 72,
              xMax: 277,
              y: 418,
              height: 11,
            },
          ],
          blocks: [
            {
              text: "DDCMUS010 172 S. | Hardcover | € 27,- 26.05.2026",
              rows: [],
              xMin: 72,
              xMax: 277,
              yTop: 423,
              yBottom: 412,
            },
          ],
        },
      ],
    };

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      layout,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    expect(queue.drafts).toHaveLength(1);
    expect(queue.drafts[0]?.sourceTitle).toBe("DC Must-Have: Batman & Superman: Supergirl");
    expect(queue.drafts[0]?.values.series.title).toBe("DC Must-Have");
    expect(queue.drafts[0]?.values.title).toBe("Batman & Superman: Supergirl");
  });

  it("should_fall_back_to_full_layout_title_text_when_only_the_tail_row_has_color", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "DC MUST-HAVE: BATMAN &",
        "SUPERMAN: SUPERGIRL",
        "Inhalt: Superman/Batman 8-13",
        "172 S. | Hardcover | € 27,-",
        "DDCMUS010",
        "26.05.2026",
      ].join("\n"),
    ].join("\n\n");
    const layout: PdfLayoutDocument = {
      pages: [
        {
          pageNumber: 21,
          width: 567,
          height: 794,
          items: [],
          rows: [
            { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
            {
              text: "DC MUST-HAVE: BATMAN &",
              items: [
                { text: "DC MUST-HAVE: BATMAN &", x: 312, y: 720, width: 170, height: 11 },
              ],
              xMin: 312,
              xMax: 482,
              y: 720,
              height: 11,
            },
            {
              text: "SUPERMAN: SUPERGIRL",
              items: [
                { text: "SUPERMAN: SUPERGIRL", x: 312, y: 696, width: 153, height: 11, fillColor: "#0097d8" },
              ],
              xMin: 312,
              xMax: 465,
              y: 696,
              height: 11,
            },
            {
              text: "Inhalt: Superman/Batman 8-13",
              items: [],
              xMin: 312,
              xMax: 520,
              y: 650,
              height: 11,
            },
            {
              text: "DDCMUS010 172 S. | Hardcover | € 27,- 26.05.2026",
              items: [],
              xMin: 320,
              xMax: 520,
              y: 418,
              height: 11,
            },
          ],
          blocks: [
            {
              text: "DDCMUS010 172 S. | Hardcover | € 27,- 26.05.2026",
              rows: [],
              xMin: 320,
              xMax: 520,
              yTop: 423,
              yBottom: 412,
            },
          ],
        },
      ],
    };

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      layout,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    expect(queue.drafts[0]?.sourceTitle).toBe("DC Must-Have: Batman & Superman: Supergirl");
    expect(queue.drafts[0]?.values.series.title).toBe("DC Must-Have");
    expect(queue.drafts[0]?.values.title).toBe("Batman & Superman: Supergirl");
  });

  it("should_keep_issue_metadata_when_the_code_is_separated_by_one_description_line", async () => {
    const text = [
      [
        "5",
        "N E U H E I T E N",
        "Nr. 109",
        "444 Ex. I € 9,-",
        "76 S. | Heft | € 6,99",
        "DBATMA109V",
        "DBATMA110",
        "12.05.2026",
        "Comic-Salon Erlangen",
        "Nr. 111",
        "BATMAN 109 + 110 + 111",
        "Story: Tom Taylor",
        "Inhalt: Detective Comics 1103 (Nr. 109); Detective Comics 1104 (Nr. 110); Detective Comics 1105, Robin and Batman: Jason Todd 3 (Nr. 111)",
        "Ausgabe 109: Foo",
        "76 S. | Heft | € 6,99",
        "Miniserie über den jungen Jason Todd alias Robin .",
        "DBATMA111",
        "09.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [{ title: "Batman", volume: 1, publisherName: "Panini" }],
      },
    });

    const draft = queue.drafts.find((entry) => entry.issueCode === "DBATMA111");
    expect(draft?.values.series.title).toBe("Batman");
    expect(draft?.values.number).toBe("111");
    expect(draft?.values.pages).toBe(76);
    expect(draft?.values.format).toBe("Heft");
    expect(draft?.values.price).toBe("6.99");
    expect(draft?.values.releasedate).toBe("2026-06-09");
  });

  it("should_keep_grouped_issue_series_titles_when_codes_are_listed_above_the_shared_title_block", async () => {
    const text = [
      [
        "5",
        "N E U H E I T E N",
        "Nr. 109",
        "76 S. | Heft | € 6,99",
        "DBATMA109",
        "07.04.2026",
        "Nr. 110",
        "Variant-Cover",
        "Nr. 109",
        "444 Ex. I € 9,-",
        "76 S. | Heft | € 6,99",
        "DBATMA109V",
        "DBATMA110",
        "12.05.2026",
        "Comic-Salon Erlangen",
        "Nr. 111",
        "Batmans neuer Gegner: Der Löwe! Batmans neuer Gegner: Der Löwe!",
        "BATMAN 109 + 110 + 111",
        "Story: Tom Taylor, Jeff Lemire (Nr. 109–111) | Zeichnungen: Mikel Janin, Dustin Nguyen (Nr. 109–111)",
        "Inhalt: Detective Comics 1103, Robin and Batman: Jason Todd 1 (Nr. 109); Detective Comics 1104, Robin and Batman: Jason Todd 2 (Nr. 110); Detective Comics 1105, Robin and Batman: Jason Todd 3 (Nr. 111)",
        "Ausgabe 109: Der neue Schurke, der Löwe, bedroht ganz Gotham mit einem Virus.",
        "76 S. | Heft | € 6,99",
        "Miniserie über den jungen Jason Todd alias Robin .",
        "DBATMA111",
        "09.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const issue109 = queue.drafts.find((draft) => draft.issueCode === "DBATMA109");
    const issue109Variant = queue.drafts.find((draft) => draft.issueCode === "DBATMA109V");
    const issue110 = queue.drafts.find((draft) => draft.issueCode === "DBATMA110");
    const issue111 = queue.drafts.find((draft) => draft.issueCode === "DBATMA111");

    expect(issue109?.values.series.title).toBe("Batman");
    expect(issue109?.values.number).toBe("109");
    expect(issue109?.values.pages).toBe(76);
    expect(issue109?.values.price).toBe("6.99");
    expect(issue109?.values.stories).toHaveLength(2);
    expect(issue109?.values.stories[0]).toMatchObject({
      parent: { issue: { series: { title: "Detective Comics" }, number: "1103" } },
    });

    expect(issue109Variant?.values.series.title).toBe("Batman");
    expect(issue109Variant?.values.variant).toBe("A");
    expect(issue109Variant?.values.pages).toBe(76);
    expect(issue109Variant?.values.price).toBe("9");

    expect(issue110?.values.series.title).toBe("Batman");
    expect(issue110?.values.number).toBe("110");
    expect(issue110?.values.pages).toBe(76);
    expect(issue110?.values.price).toBe("6.99");
    expect(issue110?.values.stories).toHaveLength(2);
    expect(issue110?.values.stories[0]).toMatchObject({
      parent: { issue: { series: { title: "Detective Comics" }, number: "1104" } },
    });

    expect(issue111?.values.series.title).toBe("Batman");
    expect(issue111?.values.number).toBe("111");
    expect(issue111?.values.pages).toBe(76);
    expect(issue111?.values.price).toBe("6.99");
    expect(issue111?.values.stories).toHaveLength(2);
  });

  it("should_ignore_old_product_code_lines_when_deriving_titles", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "DABSSM001V3 DABSBA001OEX",
        "DABSSM001OEX",
        "Comic-Salon",
        "Erlangen",
        "ABSOLUTE BATMAN 4",
        "Story: Scott Snyder",
        "Inhalt: Absolute Batman 10-12",
        "DABSBA004 76 S. | Softcover | € 9,99",
        "31.03.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const draft = queue.drafts.find((entry) => entry.issueCode === "DABSBA004");

    expect(draft?.sourceTitle).toBe("Absolute Batman 4");
    expect(draft?.values.series.title).toBe("Absolute Batman");
    expect(draft?.values.number).toBe("4");
  });

  it("should_split_series_number_and_title_when_a_colon_separates_the_issue_title", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "SUPERMAN 10:",
        "DARKSEIDS LEGION ARKSEIDS LEGION",
        "Story: Joshua Williamson",
        "Inhalt: Superman 28-30, Justice League: The Omega Act 1",
        "124 S. | Softcover | € 16,-",
        "DSUMAN010",
        "09.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const draft = queue.drafts.find((entry) => entry.issueCode === "DSUMAN010");

    expect(draft?.values.series.title).toBe("Superman");
    expect(draft?.values.number).toBe("10");
    expect(draft?.values.title).toBe("Darkseids Legion");
  });

  it("should_remove_mini_series_count_and_overlapping_ocr_tail_from_titles", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "BAT-MAN: SECOND KNIGHT 1 (VON 3) OND KNIGHT 1 (VON 3)",
        "Inhalt: Bat-Man: Second Knight 1",
        "60 S. | Hardcover | € 16,-",
        "DBLACK095",
        "09.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const draft = queue.drafts.find((entry) => entry.issueCode === "DBLACK095");

    expect(draft?.values.series.title).toBe("Bat-Man: Second Knight");
    expect(draft?.values.number).toBe("1");
    expect(draft?.values.title).toBe("");
  });

  it("should_expand_mixed_anthology_story_lists_and_ignore_u_a_markers", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "SUPERGIRL ANTHOLOGIE",
        "Inhalt: Action Comics 252, Superboy 80, Action Comics 291, Supergirl (1972) 1, Supergirl (1982) 1, Supergirl (1982) 19, Supergirl (1996) 1, Supergirl: Rebirth 1 u. a.",
        "388 S. | Hardcover | € 39,-",
        "DDCHC128",
        "02.06.2026",
      ].join("\n"),
      [
        "N E U H E I T E N",
        "LOBO: GREATEST HITS",
        "Inhalt: Lobo Paramilitary Christmas Special (1992), Lobo 0 (1993), Lobo In the Chair (1994), Lobo Goes to Hollywood (1996), Lobo Chained (1997), Batman/Lobo (2000)",
        "212 S. | Softcover | € 29,-",
        "DDCPB283",
        "26.05.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const supergirl = queue.drafts.find((entry) => entry.issueCode === "DDCHC128");
    const lobo = queue.drafts.find((entry) => entry.issueCode === "DDCPB283");

    const supergirlStories = supergirl?.values.stories.map((story) => ({
      series: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.series?.title,
      number: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.number,
    }));

    expect(supergirlStories).toEqual([
      { series: "Action Comics", number: "252" },
      { series: "Superboy", number: "80" },
      { series: "Action Comics", number: "291" },
      { series: "Supergirl", number: "1" },
      { series: "Supergirl", number: "1" },
      { series: "Supergirl", number: "19" },
      { series: "Supergirl", number: "1" },
      { series: "Supergirl: Rebirth", number: "1" },
    ]);

    expect(
      lobo?.values.stories.map((story) => ({
        series: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.series?.title,
        number: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.number,
      }))
    ).toEqual([
      { series: "Lobo Paramilitary Christmas Special", number: "1" },
      { series: "Lobo", number: "0" },
      { series: "Lobo In the Chair", number: "1" },
      { series: "Lobo Goes to Hollywood", number: "1" },
      { series: "Lobo Chained", number: "1" },
      { series: "Batman/Lobo", number: "1" },
    ]);

    expect(supergirl?.warnings).toContain("Inhalt ist unvollständig angegeben (u. a.)");
  });

  it("should_expand_multiline_anthology_story_lists_from_real_preview_layout", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "LOBO: GREATEST HITS",
        "Story: Alan Grant, Keith Giffen, Stohl | Zeichnungen: Simon Bisley,",
        "Val Semeiks, Martin Emond, Christian Alamy, Rafael Garres",
        "Inhalt: Lobo Paramilitary Christmas Special (1992), Lobo 0 (1993),",
        "Lobo In the Chair (1994), Lobo Goes to Hollywood (1996), Lobo",
        "Chained (1997), Batman/Lobo (2000)",
        "Der Prachtband zur Feier von Lobos Realfilm-Debüt in Supergirl . Wohlige",
        "212 S. | Softcover | € 29,-",
        "DDCPB283",
        "26.05.2026",
      ].join("\n"),
      [
        "N E U H E I T E N",
        "SUPERGIRL ANTHOLOGIE",
        "Story: Otto Binder, Jerry Siegel, Cary Bates, Cary Burkett, Paul",
        "Kupperberg, Roger Stern, Peter David u. v. m.",
        "Zeichnungen: Al Plastino, Curt Swan, Jim Mooney, Art Saaf, Jim",
        "Aparo, Carmine Infantino, June Brigman, Gary Frank u. v. m.",
        "Inhalt: Action Comics 252, Superboy 80, Action Comics 291,",
        "Supergirl (1972) 1, Supergirl (1982) 1, Supergirl (1982) 19,",
        "Supergirl (1996) 1, Supergirl: Rebirth 1 u. a.",
        "2026 bekommt Supergirl Kara Zor-El , 1959 von Otto Binder und Al",
        "DDCHC128 388 S. | HC | ca. 19 x 28,5 cm | € 39,-",
        "02.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const supergirl = queue.drafts.find((entry) => entry.issueCode === "DDCHC128");
    const lobo = queue.drafts.find((entry) => entry.issueCode === "DDCPB283");

    expect(
      lobo?.values.stories.map((story) => ({
        series: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.series?.title,
        number: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.number,
      }))
    ).toEqual([
      { series: "Lobo Paramilitary Christmas Special", number: "1" },
      { series: "Lobo", number: "0" },
      { series: "Lobo In the Chair", number: "1" },
      { series: "Lobo Goes to Hollywood", number: "1" },
      { series: "Lobo Chained", number: "1" },
      { series: "Batman/Lobo", number: "1" },
    ]);

    const supergirlStories = supergirl?.values.stories.map((story) => ({
      series: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.series?.title,
      number: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.number,
    }));

    expect(supergirlStories).toEqual([
      { series: "Action Comics", number: "252" },
      { series: "Superboy", number: "80" },
      { series: "Action Comics", number: "291" },
      { series: "Supergirl", number: "1" },
      { series: "Supergirl", number: "1" },
      { series: "Supergirl", number: "19" },
      { series: "Supergirl", number: "1" },
      { series: "Supergirl: Rebirth", number: "1" },
    ]);

    expect(supergirl?.warnings).toContain("Inhalt ist unvollständig angegeben (u. a.)");
  });

  it("should_warn_when_material_aus_indicates_additional_unstructured_content", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "SUPERGIRL DELUXE",
        "Inhalt: Supergirl: Woman of Tomorrow 1-8, Material aus Inhalt: Supergirl: Being Super 1-4",
        "276 S. | Hardcover | € 39,-",
        "DDCHC129",
        "26.05.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const draft = queue.drafts.find((entry) => entry.issueCode === "DDCHC129");

    expect(draft?.warnings).toContain(
      "Inhalt enthält zusätzliches, nicht vollständig aufgeschlüsseltes Material"
    );
    expect(
      draft?.values.stories.map((story) => ({
        series: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.series?.title,
        number: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.number,
      }))
    ).toEqual([
      { series: "Supergirl: Woman of Tomorrow", number: "1" },
      { series: "Supergirl: Woman of Tomorrow", number: "2" },
      { series: "Supergirl: Woman of Tomorrow", number: "3" },
      { series: "Supergirl: Woman of Tomorrow", number: "4" },
      { series: "Supergirl: Woman of Tomorrow", number: "5" },
      { series: "Supergirl: Woman of Tomorrow", number: "6" },
      { series: "Supergirl: Woman of Tomorrow", number: "7" },
      { series: "Supergirl: Woman of Tomorrow", number: "8" },
      { series: "Supergirl: Being Super", number: "1" },
      { series: "Supergirl: Being Super", number: "2" },
      { series: "Supergirl: Being Super", number: "3" },
      { series: "Supergirl: Being Super", number: "4" },
    ]);
  });

  it("should_keep_material_aus_reference_segments_when_the_phrase_breaks_across_lines", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "BATMAN: DAS LANGE HALLOWEEN 1 (VON 2) (DELUXE EDITION)",
        "Inhalt: Batman: Long Halloween 1-13, Batman: When in Rome 1-6, Batman: Legends of the Dark Knight Halloween Special 1-3, Material",
        "aus Superman/Batman Secret Files 1",
        "772 S. | HC | ca. 19 x 28,5 cm | € 85,-",
        "DDCHC132",
        "23.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const draft = queue.drafts.find((entry) => entry.issueCode === "DDCHC132");

    expect(
      draft?.values.stories.map((story) => ({
        series: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.series?.title,
        number: (story.parent as { issue?: { series?: { title?: string }; number?: string } })?.issue?.number,
      }))
    ).toContainEqual({ series: "Superman/Batman Secret Files", number: "1" });
    expect(draft?.warnings).toContain(
      "Inhalt enthält zusätzliches, nicht vollständig aufgeschlüsseltes Material"
    );
  });

  it("should_remove_neighbor_title_noise_from_merged_deluxe_titles", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "SUPERGIRL: DIE FRAU VON SUPERGIRL -",
        "MORGEN (DELUXE EDITION) EINFACH SUPER!?",
        "Inhalt: Supergirl: Woman of Tomorrow 1-8, Material aus Inhalt: Supergirl: Being Super 1-4",
        "DDCHC129 276 S. | HC | ca. 19 x 28,5 cm | € 39,- DDCPB295C auf 250 Ex. lim. HC | € 42,-",
        "26.05.2026 02.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const draft = queue.drafts.find((entry) => entry.issueCode === "DDCHC129");

    expect(draft?.values.series.title).toBe("Supergirl: Die Frau Von Morgen (Deluxe Edition)");
    expect(draft?.values.title).toBe("");
  });

  it("should_assign_hardcover_variants_to_their_matching_softcover_base_code", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "SUPERGIRL: DIE FRAU VON SUPERGIRL -",
        "MORGEN (DELUXE EDITION) EINFACH SUPER!?",
        "Inhalt: Supergirl: Woman of Tomorrow 1-8, Material aus Inhalt: Supergirl: Being Super 1-4",
        "Hardcover",
        "DDCPB295 212 S. | Softcover | € 25,-",
        "02.06.2026",
        "DDCHC129 276 S. | HC | ca. 19 x 28,5 cm | € 39,- DDCPB295C auf 250 Ex. lim. HC | € 42,-",
        "26.05.2026 02.06.2026",
      ].join("\n"),
    ].join("\n\n");
    const layout: PdfLayoutDocument = {
      pages: [
        {
          pageNumber: 17,
          width: 567,
          height: 794,
          items: [],
          rows: [
            { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
            { text: "SUPERGIRL -", items: [], xMin: 320, xMax: 410, y: 713, height: 11 },
            { text: "EINFACH SUPER!?", items: [], xMin: 320, xMax: 470, y: 689, height: 11 },
            { text: "Inhalt: Supergirl: Being Super 1-4", items: [], xMin: 320, xMax: 500, y: 650, height: 11 },
            { text: "DDCPB295 212 S. | Softcover | € 25,-02.06.2026", items: [], xMin: 329, xMax: 535, y: 418, height: 11 },
            { text: "SUPERGIRL: DIE FRAU VON", items: [], xMin: 60, xMax: 280, y: 713, height: 11 },
            { text: "MORGEN (DELUXE EDITION)", items: [], xMin: 60, xMax: 320, y: 689, height: 11 },
            { text: "Inhalt: Supergirl: Woman of Tomorrow 1-8, Material aus Inhalt: Supergirl: Being Super 1-4", items: [], xMin: 60, xMax: 340, y: 650, height: 11 },
            {
              text: "DDCHC129 276 S. | HC | ca. 19 x 28,5 cm | € 39,- DDCPB295C auf 250 Ex. lim. HC | € 42,-02.06.2026",
              items: [],
              xMin: 60,
              xMax: 535,
              y: 418,
              height: 11,
            },
          ],
          blocks: [
            { text: "DDCPB295 212 S. | Softcover | € 25,-02.06.2026", rows: [], xMin: 329, xMax: 535, yTop: 423, yBottom: 412 },
            { text: "DDCHC129 276 S. | HC | ca. 19 x 28,5 cm | € 39,-", rows: [], xMin: 60, xMax: 277, yTop: 423, yBottom: 412 },
            { text: "DDCPB295C auf 250 Ex. lim. HC | € 42,-02.06.2026", rows: [], xMin: 329, xMax: 535, yTop: 423, yBottom: 412 },
          ],
        },
      ],
    };

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      layout,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const softcover = queue.drafts.find((entry) => entry.issueCode === "DDCPB295");
    const hardcoverVariant = queue.drafts.find((entry) => entry.issueCode === "DDCPB295C");

    expect(hardcoverVariant?.variantOfDraftId).toBe(softcover?.id);
    expect(hardcoverVariant?.values.series.title).toBe("Supergirl - Einfach Super!?");
    expect(hardcoverVariant?.values.title).toBe("");
    expect(hardcoverVariant?.values.stories).toHaveLength(0);
  });

  it("should_treat_hardcover_companion_editions_as_variants_without_stories", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "JUSTICE LEAGUE SONDERBAND 3:",
        "DER GROSSE BRUCH",
        "Inhalt: Cheetah & Cheshire Rob the Justice League 1-6",
        "156 S. | Softcover | € 20,-",
        "DJULSB003",
        "23.06.2026",
        "156 S. | Hardcover | € 30,-",
        "DJULSB003C",
        "23.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const softcover = queue.drafts.find((entry) => entry.issueCode === "DJULSB003");
    const hardcover = queue.drafts.find((entry) => entry.issueCode === "DJULSB003C");

    expect(softcover?.values.variant).toBe("");
    expect(hardcover?.values.variant).toBe("A");
    expect(hardcover?.variantOfDraftId).toBe(softcover?.id);
    expect(hardcover?.values.format).toBe("Hardcover");
    expect(hardcover?.values.stories).toHaveLength(0);
  });

  it("should_not_warn_for_valid_content_lines_without_issue_numbers", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "WONDER WOMAN & HARLEY",
        "QUINN: FLUCH UND SEGEN",
        "Inhalt: Wonder Woman/Harley Quinn: La Souffrance et le Don",
        "148 S. | Hardcover | € 35,-",
        "DDCHC142",
        "09.06.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const draft = queue.drafts.find((entry) => entry.issueCode === "DDCHC142");

    expect(draft?.warnings).toEqual([]);
    expect(draft?.values.stories).toHaveLength(1);
    expect(draft?.values.stories[0]).toMatchObject({
      parent: {
        issue: {
          series: { title: "Wonder Woman/Harley Quinn: La Souffrance et le Don" },
          number: "1",
        },
      },
    });
  });

  it("should_split_interleaved_page_ten_products_into_worlds_finest_batman_robin_titans_and_new_gods", async () => {
    const text = [
      [
        "N E U H E I T E N",
        "BATMAN/SUPERMAN: BATMAN & ROBIN 4",
        "Story: Philipp Kennedy Johnson",
        "WORLD’S FINEST 7",
        "Story: Mark Waid, Mark Russell",
        "Inhalt: Batman & Robin (2023) 20-24",
        "Inhalt: Batman/Superman: World’s Finest 40-44",
        "DWORFI007 132 S. | Softcover | € 17,- DBAROB004 140 S. | Softcover | € 18,-",
        "12.05.2026 07.04.2026",
        "TITANS 6: NEW GODS 2:",
        "DEATHSTROKES RÜCKKEHR AM RAND DER FINSTERNIS",
        "Story: John Layman, Phil Jimenez Story: Ram V",
        "Inhalt: Titans 22-27, Titans Annual 2025",
        "Deathstroke entfesselt Inhalt: The New Gods 7-12",
        "DNGODS002 148 S. | Softcover | € 19,-",
        "26.05.2026",
        "DTI2SB006 188 S. | Softcover | € 25,- DNGODS002C 148 S. | Hardcover | € 25,-",
        "31.03.2026 26.05.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const worldsFinest = queue.drafts.find((entry) => entry.issueCode === "DWORFI007");
    const batmanRobin = queue.drafts.find((entry) => entry.issueCode === "DBAROB004");
    const titans = queue.drafts.find((entry) => entry.issueCode === "DTI2SB006");
    const newGods = queue.drafts.find((entry) => entry.issueCode === "DNGODS002");
    const newGodsHardcover = queue.drafts.find((entry) => entry.issueCode === "DNGODS002C");

    expect(worldsFinest?.values.series.title).toBe("Batman/Superman: World’s Finest");
    expect(worldsFinest?.values.number).toBe("7");
    expect(worldsFinest?.values.title).toBe("");
    expect(worldsFinest?.values.stories).toHaveLength(5);

    expect(batmanRobin?.values.series.title).toBe("Batman & Robin");
    expect(batmanRobin?.values.number).toBe("4");
    expect(batmanRobin?.values.title).toBe("");
    expect(batmanRobin?.values.stories).toHaveLength(5);

    expect(titans?.values.series.title).toBe("Titans");
    expect(titans?.values.number).toBe("6");
    expect(titans?.values.title).toBe("Deathstrokes Rückkehr");
    expect(titans?.values.pages).toBe(188);
    expect(titans?.values.price).toBe("25");
    expect(titans?.values.releasedate).toBe("2026-03-31");

    expect(newGods?.values.series.title).toBe("New Gods");
    expect(newGods?.values.number).toBe("2");
    expect(newGods?.values.title).toBe("Am Rand Der Finsternis");
    expect(newGods?.values.pages).toBe(148);
    expect(newGods?.values.price).toBe("19");
    expect(newGods?.values.releasedate).toBe("2026-05-26");

    expect(newGodsHardcover?.values.series.title).toBe("New Gods");
    expect(newGodsHardcover?.values.number).toBe("2");
    expect(newGodsHardcover?.values.title).toBe("Am Rand Der Finsternis");
    expect(newGodsHardcover?.values.variant).toBe("A");
    expect(newGodsHardcover?.variantOfDraftId).toBe(newGods?.id);
    expect(newGodsHardcover?.values.format).toBe("Hardcover");
    expect(newGodsHardcover?.values.price).toBe("25");
    expect(newGodsHardcover?.values.stories).toHaveLength(0);
  });

  it("should_assign_parallel_product_metadata_without_falling_into_following_blocks", async () => {
    const text = [
      [
        "8",
        "N E U H E I T E N",
        "BATMAN/SUPERMAN: BATMAN & ROBIN 4",
        "Story: Philipp Kennedy Johnson",
        "WORLD’S FINEST 7",
        "Zeichnungen: Javi Fernández",
        "Story: Mark Waid",
        "Inhalt: Batman & Robin (2023) 20-24",
        "Zeichnungen: Adrián Gutiérrez",
        "Inhalt: Batman/Superman: World’s Finest 40-44",
        "DWORFI007 132 S. | Softcover | € 17,- DBAROB004 140 S. | Softcover | € 18,-",
        "12.05.2026 07.04.2026",
      ].join("\n"),
    ].join("\n\n");

    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      text,
      seriesReader: {
        findDeSeriesByTitle: async () => [],
      },
    });

    const worldsFinest = queue.drafts.find((draft) => draft.issueCode === "DWORFI007");
    const batmanRobin = queue.drafts.find((draft) => draft.issueCode === "DBAROB004");

    expect(worldsFinest?.values.number).toBe("7");
    expect(worldsFinest?.values.price).toBe("17");

    expect(batmanRobin?.values.price).toBe("18");
  });
});
