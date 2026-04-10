import type { PdfLayoutPage } from "../types/pdf-layout";
import { analyzePreviewImportLayoutPage, isNeuheitenLayoutPage } from "./preview-import-layout";

describe("preview-import-layout", () => {
  it("should_detect_neuheiten_pages_even_when_the_heading_is_duplicated_in_one_row", () => {
    const page: PdfLayoutPage = {
      pageNumber: 13,
      width: 567,
      height: 794,
      items: [],
      rows: [
        {
          text: "N E U H E I T E N N E U H E I T E N",
          items: [],
          xMin: 53,
          xMax: 165,
          y: 773,
          height: 11,
        },
      ],
      blocks: [],
    };

    expect(isNeuheitenLayoutPage(page)).toBe(true);
  });

  it("should_match_metadata_blocks_with_nearest_content_and_title_rows", () => {
    const page: PdfLayoutPage = {
      pageNumber: 10,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 449, xMax: 560, y: 773, height: 11 },
        { text: "BATMAN/SUPERMAN:", items: [], xMin: 63, xMax: 190, y: 713, height: 11 },
        { text: "WORLD'S FINEST 7", items: [], xMin: 63, xMax: 220, y: 689, height: 11 },
        { text: "Inhalt: Batman/Superman: World's Finest 40-44", items: [], xMin: 63, xMax: 300, y: 650, height: 11 },
        { text: "BATMAN & ROBIN 4", items: [], xMin: 320, xMax: 515, y: 713, height: 11 },
        { text: "Inhalt: Batman & Robin (2023) 20-24", items: [], xMin: 320, xMax: 515, y: 663, height: 11 },
        { text: "DWORFI007 132 S. | Softcover | € 17,-12.05.2026", items: [], xMin: 72, xMax: 277, y: 418, height: 11 },
        { text: "DBAROB004 140 S. | Softcover | € 18,-07.04.2026", items: [], xMin: 329, xMax: 535, y: 418, height: 11 },
      ],
      blocks: [
        { text: "DWORFI007 132 S. | Softcover | € 17,-12.05.2026", rows: [], xMin: 72, xMax: 277, yTop: 423, yBottom: 412 },
        { text: "DBAROB004 140 S. | Softcover | € 18,-07.04.2026", rows: [], xMin: 329, xMax: 535, yTop: 423, yBottom: 412 },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);

    expect(analysis.usesMultiColumnPattern).toBe(true);
    expect(analysis.anchors).toHaveLength(2);
    expect(analysis.anchors[0]?.issueCode).toBe("DWORFI007");
    expect(analysis.anchors[0]?.contentRow?.text).toContain("World's Finest 40-44");
    expect(analysis.anchors[0]?.contentText).toContain("World's Finest 40-44");
    expect(analysis.anchors[0]?.titleRows.map((row) => row.text)).toEqual([
      "BATMAN/SUPERMAN:",
      "WORLD'S FINEST 7",
    ]);
    expect(analysis.anchors[0]?.titleText).toBe("BATMAN/SUPERMAN: WORLD'S FINEST 7");
    expect(analysis.anchors[0]?.confidence).toBeGreaterThanOrEqual(4);
    expect(analysis.anchors[1]?.issueCode).toBe("DBAROB004");
    expect(analysis.anchors[1]?.contentRow?.text).toContain("Batman & Robin (2023) 20-24");
    expect(analysis.anchors[1]?.titleRows.map((row) => row.text)).toEqual(["BATMAN & ROBIN 4"]);
  });

  it("should_slice_shared_title_rows_to_the_current_metadata_band", () => {
    const page: PdfLayoutPage = {
      pageNumber: 10,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 449, xMax: 560, y: 773, height: 11 },
        { text: "TITANS 6:", items: [{ text: "TITANS", x: 60, y: 713, width: 46, height: 11 }, { text: "6:", x: 112, y: 713, width: 12, height: 11 }], xMin: 60, xMax: 124, y: 713, height: 11 },
        {
          text: "DEATHSTROKES RÜCKKEHR AM RAND DER FINSTERNIS",
          items: [
            { text: "DEATHSTROKES", x: 60, y: 689, width: 92, height: 11 },
            { text: "RÜCKKEHR", x: 158, y: 689, width: 64, height: 11 },
            { text: "AM", x: 325, y: 689, width: 18, height: 11 },
            { text: "RAND", x: 349, y: 689, width: 30, height: 11 },
            { text: "DER", x: 385, y: 689, width: 22, height: 11 },
            { text: "FINSTERNIS", x: 413, y: 689, width: 70, height: 11 },
          ],
          xMin: 60,
          xMax: 483,
          y: 689,
          height: 11,
        },
        { text: "Inhalt: Titans 22-27, Titans Annual 2025", items: [{ text: "Inhalt:", x: 60, y: 650, width: 40, height: 11 }, { text: "Titans", x: 104, y: 650, width: 34, height: 11 }, { text: "22-27,", x: 144, y: 650, width: 35, height: 11 }, { text: "Titans", x: 184, y: 650, width: 34, height: 11 }, { text: "Annual", x: 224, y: 650, width: 40, height: 11 }, { text: "2025", x: 269, y: 650, width: 25, height: 11 }], xMin: 60, xMax: 294, y: 650, height: 11 },
        { text: "NEW GODS 2:", items: [{ text: "NEW", x: 320, y: 713, width: 28, height: 11 }, { text: "GODS", x: 352, y: 713, width: 34, height: 11 }, { text: "2:", x: 390, y: 713, width: 12, height: 11 }], xMin: 320, xMax: 402, y: 713, height: 11 },
        { text: "Inhalt: The New Gods 7-12", items: [{ text: "Inhalt:", x: 320, y: 650, width: 40, height: 11 }, { text: "The", x: 364, y: 650, width: 22, height: 11 }, { text: "New", x: 390, y: 650, width: 24, height: 11 }, { text: "Gods", x: 418, y: 650, width: 31, height: 11 }, { text: "7-12", x: 454, y: 650, width: 28, height: 11 }], xMin: 320, xMax: 482, y: 650, height: 11 },
        { text: "DTI2SB006 188 S. | Softcover | € 25,-31.03.2026", items: [], xMin: 72, xMax: 277, y: 418, height: 11 },
        { text: "DNGODS002 148 S. | Softcover | € 19,-26.05.2026", items: [], xMin: 329, xMax: 535, y: 418, height: 11 },
      ],
      blocks: [
        { text: "DTI2SB006 188 S. | Softcover | € 25,-31.03.2026", rows: [], xMin: 72, xMax: 277, yTop: 423, yBottom: 412 },
        { text: "DNGODS002 148 S. | Softcover | € 19,-26.05.2026", rows: [], xMin: 329, xMax: 535, yTop: 423, yBottom: 412 },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);

    expect(analysis.anchors[0]?.issueCode).toBe("DTI2SB006");
    expect(analysis.anchors[0]?.titleRows.map((row) => row.text)).toEqual([
      "TITANS 6:",
      "DEATHSTROKES RÜCKKEHR",
    ]);
    expect(analysis.anchors[1]?.issueCode).toBe("DNGODS002");
    expect(analysis.anchors[1]?.titleRows.map((row) => row.text)).toEqual([
      "NEW GODS 2:",
      "AM RAND DER FINSTERNIS",
    ]);
  });

  it("should_collect_multiline_content_rows_for_layout_anchors", () => {
    const page: PdfLayoutPage = {
      pageNumber: 17,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
        { text: "SUPERGIRL ANTHOLOGIE", items: [], xMin: 60, xMax: 240, y: 720, height: 11 },
        { text: "Inhalt: Action Comics 252, Superboy 80, Action Comics 291,", items: [], xMin: 60, xMax: 300, y: 650, height: 11 },
        { text: "Supergirl (1972) 1, Supergirl (1982) 1, Supergirl (1982) 19,", items: [], xMin: 60, xMax: 320, y: 636, height: 11 },
        { text: "Supergirl (1996) 1, Supergirl: Rebirth 1 u. a.", items: [], xMin: 60, xMax: 290, y: 622, height: 11 },
        { text: "2026 bekommt Supergirl Kara Zor-El", items: [], xMin: 60, xMax: 260, y: 608, height: 11 },
        { text: "DDCHC128 388 S. | HC | € 39,- 02.06.2026", items: [], xMin: 72, xMax: 277, y: 418, height: 11 },
      ],
      blocks: [
        { text: "DDCHC128 388 S. | HC | € 39,- 02.06.2026", rows: [], xMin: 72, xMax: 277, yTop: 423, yBottom: 412 },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);

    expect(analysis.anchors).toHaveLength(1);
    expect(analysis.anchors[0]?.contentRows.map((row) => row.text)).toEqual([
      "Inhalt: Action Comics 252, Superboy 80, Action Comics 291,",
      "Supergirl (1972) 1, Supergirl (1982) 1, Supergirl (1982) 19,",
      "Supergirl (1996) 1, Supergirl: Rebirth 1 u. a.",
    ]);
    expect(analysis.anchors[0]?.contentText).toContain("Supergirl: Rebirth 1 u. a.");
  });

  it("should_continue_layout_content_rows_when_material_aus_wraps_to_the_next_line", () => {
    const page: PdfLayoutPage = {
      pageNumber: 20,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
        { text: "BATMAN: DAS LANGE HALLOWEEN 1", items: [], xMin: 320, xMax: 520, y: 717, height: 11 },
        { text: "(VON 2) (DELUXE EDITION)", items: [], xMin: 320, xMax: 520, y: 699, height: 11 },
        { text: "Inhalt: Batman: Long Halloween 1-13, Batman: When in", items: [], xMin: 320, xMax: 520, y: 661, height: 11 },
        { text: "Rome 1-6, Batman: Legends of the Dark Knight Halloween", items: [], xMin: 320, xMax: 520, y: 649, height: 11 },
        { text: "Special 1-3, Material", items: [], xMin: 320, xMax: 470, y: 638, height: 11 },
        { text: "aus Superman/Batman Secret Files 1", items: [], xMin: 320, xMax: 500, y: 627, height: 11 },
        { text: "DDCHC132 772 S. | HC | ca. 19 x 28,5 cm | € 85,-23.06.2026", items: [], xMin: 332, xMax: 557, y: 413, height: 11 },
      ],
      blocks: [
        { text: "DDCHC132 772 S. | HC | ca. 19 x 28,5 cm | € 85,-23.06.2026", rows: [], xMin: 332, xMax: 557, yTop: 418, yBottom: 407 },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);
    const deluxe = analysis.anchors.find((anchor) => anchor.issueCode === "DDCHC132");

    expect(deluxe?.contentRows.map((row) => row.text)).toEqual([
      "Inhalt: Batman: Long Halloween 1-13, Batman: When in",
      "Rome 1-6, Batman: Legends of the Dark Knight Halloween",
      "Special 1-3, Material",
      "aus Superman/Batman Secret Files 1",
    ]);
  });

  it("should_keep_top_full_width_and_two_lower_columns_separated", () => {
    const page: PdfLayoutPage = {
      pageNumber: 17,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
        { text: "SUPERGIRL ANTHOLOGIE", items: [], xMin: 60, xMax: 240, y: 720, height: 11 },
        { text: "Inhalt: Action Comics 252, Superboy 80, Action Comics 291,", items: [], xMin: 60, xMax: 300, y: 650, height: 11 },
        { text: "SUPERGIRL: DIE FRAU VON", items: [], xMin: 60, xMax: 250, y: 360, height: 11 },
        { text: "MORGEN (DELUXE EDITION)", items: [], xMin: 60, xMax: 300, y: 336, height: 11 },
        { text: "Inhalt: Supergirl: Woman of Tomorrow 1-8", items: [], xMin: 60, xMax: 320, y: 300, height: 11 },
        { text: "SUPERGIRL -", items: [], xMin: 320, xMax: 410, y: 360, height: 11 },
        { text: "EINFACH SUPER!?", items: [], xMin: 320, xMax: 470, y: 336, height: 11 },
        { text: "Inhalt: Supergirl: Being Super 1-4", items: [], xMin: 320, xMax: 500, y: 300, height: 11 },
        { text: "DDCHC128 388 S. | HC | € 39,- 02.06.2026", items: [], xMin: 72, xMax: 277, y: 418, height: 11 },
        { text: "DDCHC129 276 S. | HC | € 39,- 26.05.2026", items: [], xMin: 72, xMax: 277, y: 120, height: 11 },
        { text: "DDCPB295 212 S. | Softcover | € 25,- 02.06.2026", items: [], xMin: 329, xMax: 535, y: 120, height: 11 },
      ],
      blocks: [
        { text: "DDCHC128 388 S. | HC | € 39,- 02.06.2026", rows: [], xMin: 72, xMax: 277, yTop: 423, yBottom: 412 },
        { text: "DDCHC129 276 S. | HC | € 39,- 26.05.2026", rows: [], xMin: 72, xMax: 277, yTop: 125, yBottom: 114 },
        { text: "DDCPB295 212 S. | Softcover | € 25,- 02.06.2026", rows: [], xMin: 329, xMax: 535, yTop: 125, yBottom: 114 },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);

    expect(analysis.anchors).toHaveLength(3);
    expect(analysis.anchors[0]?.issueCode).toBe("DDCHC128");
    expect(analysis.anchors[0]?.titleRows.map((row) => row.text)).toEqual(["SUPERGIRL ANTHOLOGIE"]);
    expect(analysis.anchors[0]?.contentText).toContain("Action Comics 252");

    expect(analysis.anchors[1]?.issueCode).toBe("DDCHC129");
    expect(analysis.anchors[1]?.titleRows.map((row) => row.text)).toEqual([
      "SUPERGIRL: DIE FRAU VON",
      "MORGEN (DELUXE EDITION)",
    ]);
    expect(analysis.anchors[1]?.contentText).toContain("Woman of Tomorrow 1-8");

    expect(analysis.anchors[2]?.issueCode).toBe("DDCPB295");
    expect(analysis.anchors[2]?.titleRows.map((row) => row.text)).toEqual([
      "SUPERGIRL -",
      "EINFACH SUPER!?",
    ]);
    expect(analysis.anchors[2]?.contentText).toContain("Being Super 1-4");
  });

  it("should_capture_top_full_width_titles_when_grouped_issue_codes_are_far_below", () => {
    const page: PdfLayoutPage = {
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
    };

    const analysis = analyzePreviewImportLayoutPage(page);

    expect(analysis.anchors.map((anchor) => anchor.issueCode)).toEqual([
      "DSTRAP001",
      "DSTRAP002",
      "DSTRAP001V",
    ]);
    expect(analysis.anchors[0]?.titleRows.map((row) => row.text)).toEqual([
      "STRANGE PICTURES - SELTSAME BILDER 1 + 2",
    ]);
    expect(analysis.anchors[1]?.titleRows.map((row) => row.text)).toEqual([
      "STRANGE PICTURES - SELTSAME BILDER 1 + 2",
    ]);
    expect(analysis.anchors[2]?.titleRows.map((row) => row.text)).toEqual([
      "STRANGE PICTURES - SELTSAME BILDER 1 + 2",
    ]);
  });

  it("should_capture_titles_below_metadata_when_the_layout_places_codes_above_the_lower_columns", () => {
    const page: PdfLayoutPage = {
      pageNumber: 65,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
        { text: "DWITCHL001 196 S. | SC, sw | € 12,- 16.06.2026", items: [], xMin: 64, xMax: 269, y: 240, height: 11 },
        { text: "DGORGO001 420 S. | SC, farbig | € 20,- 16.06.2026", items: [], xMin: 322, xMax: 527, y: 240, height: 11 },
        { text: "JAADUGAR: EINE HEXE", items: [], xMin: 55, xMax: 190, y: 180, height: 11 },
        { text: "IN DER MONGOLEI 1", items: [], xMin: 55, xMax: 195, y: 156, height: 11 },
        { text: "GORGONIA - VON MYTHEN,", items: [], xMin: 322, xMax: 500, y: 180, height: 11 },
        { text: "GÖTTERN UND SCHICKSAL", items: [], xMin: 322, xMax: 510, y: 156, height: 11 },
        { text: "Story | Zeichnungen: Tomato Soup", items: [], xMin: 55, xMax: 230, y: 132, height: 11 },
        { text: "Story: Eleonora Gatta | Zeichnungen: Cristina Kokoro", items: [], xMin: 322, xMax: 520, y: 132, height: 11 },
      ],
      blocks: [
        { text: "DWITCHL001 196 S. | SC, sw | € 12,- 16.06.2026", rows: [], xMin: 64, xMax: 269, yTop: 245, yBottom: 235 },
        { text: "DGORGO001 420 S. | SC, farbig | € 20,- 16.06.2026", rows: [], xMin: 322, xMax: 527, yTop: 245, yBottom: 235 },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);

    expect(analysis.anchors.find((anchor) => anchor.issueCode === "DWITCHL001")?.titleRows.map((row) => row.text)).toEqual([
      "JAADUGAR: EINE HEXE",
      "IN DER MONGOLEI 1",
    ]);
    expect(analysis.anchors.find((anchor) => anchor.issueCode === "DGORGO001")?.titleRows.map((row) => row.text)).toEqual([
      "GORGONIA - VON MYTHEN,",
      "GÖTTERN UND SCHICKSAL",
    ]);
  });

  it("should_split_multiple_issue_codes_that_share_one_metadata_row", () => {
    const page: PdfLayoutPage = {
      pageNumber: 17,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
        { text: "SUPERGIRL: DIE FRAU VON", items: [], xMin: 60, xMax: 250, y: 360, height: 11 },
        { text: "MORGEN (DELUXE EDITION)", items: [], xMin: 60, xMax: 300, y: 336, height: 11 },
        { text: "Inhalt: Supergirl: Woman of Tomorrow 1-8", items: [], xMin: 60, xMax: 320, y: 300, height: 11 },
        { text: "SUPERGIRL -", items: [], xMin: 320, xMax: 410, y: 360, height: 11 },
        { text: "EINFACH SUPER!?", items: [], xMin: 320, xMax: 470, y: 336, height: 11 },
        { text: "Inhalt: Supergirl: Being Super 1-4", items: [], xMin: 320, xMax: 500, y: 300, height: 11 },
        {
          text: "DDCHC129 276 S. | HC | € 39,- DDCPB295C auf 250 Ex. lim. HC | € 42,- 26.05.2026 02.06.2026",
          items: [
            { text: "DDCHC129", x: 72, y: 120, width: 58, height: 11 },
            { text: "276", x: 138, y: 120, width: 18, height: 11 },
            { text: "S.", x: 160, y: 120, width: 10, height: 11 },
            { text: "|", x: 174, y: 120, width: 6, height: 11 },
            { text: "HC", x: 184, y: 120, width: 15, height: 11 },
            { text: "|", x: 203, y: 120, width: 6, height: 11 },
            { text: "€", x: 213, y: 120, width: 8, height: 11 },
            { text: "39,-", x: 224, y: 120, width: 26, height: 11 },
            { text: "DDCPB295C", x: 329, y: 120, width: 66, height: 11 },
            { text: "auf", x: 401, y: 120, width: 20, height: 11 },
            { text: "250", x: 425, y: 120, width: 18, height: 11 },
            { text: "Ex.", x: 447, y: 120, width: 18, height: 11 },
            { text: "lim.", x: 469, y: 120, width: 22, height: 11 },
            { text: "HC", x: 495, y: 120, width: 15, height: 11 },
            { text: "|", x: 514, y: 120, width: 6, height: 11 },
            { text: "€", x: 524, y: 120, width: 8, height: 11 },
            { text: "42,-", x: 535, y: 120, width: 26, height: 11 },
          ],
          xMin: 72,
          xMax: 561,
          y: 120,
          height: 11,
        },
      ],
      blocks: [
        {
          text: "DDCHC129 276 S. | HC | € 39,- DDCPB295C auf 250 Ex. lim. HC | € 42,- 26.05.2026 02.06.2026",
          rows: [
            {
              text: "DDCHC129 276 S. | HC | € 39,- DDCPB295C auf 250 Ex. lim. HC | € 42,- 26.05.2026 02.06.2026",
              items: [
                { text: "DDCHC129", x: 72, y: 120, width: 58, height: 11 },
                { text: "276", x: 138, y: 120, width: 18, height: 11 },
                { text: "S.", x: 160, y: 120, width: 10, height: 11 },
                { text: "|", x: 174, y: 120, width: 6, height: 11 },
                { text: "HC", x: 184, y: 120, width: 15, height: 11 },
                { text: "|", x: 203, y: 120, width: 6, height: 11 },
                { text: "€", x: 213, y: 120, width: 8, height: 11 },
                { text: "39,-", x: 224, y: 120, width: 26, height: 11 },
                { text: "DDCPB295C", x: 329, y: 120, width: 66, height: 11 },
                { text: "auf", x: 401, y: 120, width: 20, height: 11 },
                { text: "250", x: 425, y: 120, width: 18, height: 11 },
                { text: "Ex.", x: 447, y: 120, width: 18, height: 11 },
                { text: "lim.", x: 469, y: 120, width: 22, height: 11 },
                { text: "HC", x: 495, y: 120, width: 15, height: 11 },
                { text: "|", x: 514, y: 120, width: 6, height: 11 },
                { text: "€", x: 524, y: 120, width: 8, height: 11 },
                { text: "42,-", x: 535, y: 120, width: 26, height: 11 },
              ],
              xMin: 72,
              xMax: 561,
              y: 120,
              height: 11,
            },
          ],
          xMin: 72,
          xMax: 561,
          yTop: 125,
          yBottom: 114,
        },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);

    expect(analysis.anchors).toHaveLength(2);
    expect(analysis.anchors[0]?.issueCode).toBe("DDCHC129");
    expect(analysis.anchors[1]?.issueCode).toBe("DDCPB295C");
  });

  it("should_trim_oversized_metadata_blocks_down_to_the_code_row_band", () => {
    const page: PdfLayoutPage = {
      pageNumber: 19,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
        { text: "JUSTICE LEAGUE VS.", items: [], xMin: 60, xMax: 210, y: 720, height: 11 },
        { text: "GODZILLA VS. KONG 2", items: [], xMin: 60, xMax: 240, y: 696, height: 11 },
        { text: "Inhalt: Justice League vs Godzilla vs Kong (2025) 1-7", items: [], xMin: 60, xMax: 340, y: 650, height: 11 },
        { text: "BATMAN - GOTHAM BY GASLIGHT:", items: [], xMin: 60, xMax: 260, y: 360, height: 11 },
        { text: "EINE LIGA FÜR GERECHTIGKEIT", items: [], xMin: 60, xMax: 300, y: 336, height: 11 },
        { text: "Inhalt: Batman: Gotham by Gaslight: A League for Justice 1-6", items: [], xMin: 60, xMax: 350, y: 300, height: 11 },
        { text: "DIE NEUE GESCHICHTE", items: [], xMin: 320, xMax: 470, y: 360, height: 11 },
        { text: "DES DC-UNIVERSUMS", items: [], xMin: 320, xMax: 470, y: 336, height: 11 },
        { text: "Inhalt: New History of", items: [], xMin: 320, xMax: 430, y: 300, height: 11 },
        { text: "the DC Universe 1-4", items: [], xMin: 320, xMax: 450, y: 286, height: 11 },
        {
          text: "BATMAN - GOTHAM BY GASLIGHT: EINE LIGA FÜR GERECHTIGKEIT Story: Andy Diggle Zeichnungen: Leandro Fernandez Inhalt: Batman: Gotham by Gaslight: A League for Justice 1-6 DELSEW005 220 S. | Softcover | € 29,-26.05.2026",
          items: [
            { text: "DELSEW005", x: 72, y: 120, width: 62, height: 11 },
            { text: "220", x: 142, y: 120, width: 18, height: 11 },
            { text: "S.", x: 164, y: 120, width: 10, height: 11 },
            { text: "|", x: 178, y: 120, width: 6, height: 11 },
            { text: "Softcover", x: 188, y: 120, width: 54, height: 11 },
            { text: "|", x: 246, y: 120, width: 6, height: 11 },
            { text: "€", x: 256, y: 120, width: 8, height: 11 },
            { text: "29,-", x: 268, y: 120, width: 26, height: 11 },
          ],
          xMin: 60,
          xMax: 300,
          y: 120,
          height: 11,
        },
        { text: "DDCPB292 220 S. | Softcover | € 29,-23.06.2026", items: [], xMin: 72, xMax: 277, y: 418, height: 11 },
        { text: "DDCHC127 220 S. | HC | ca. 21 x 32 cm | € 39,-09.06.2026", items: [], xMin: 329, xMax: 535, y: 120, height: 11 },
      ],
      blocks: [
        { text: "DDCPB292 220 S. | Softcover | € 29,-23.06.2026", rows: [], xMin: 72, xMax: 277, yTop: 423, yBottom: 412 },
        {
          text: "BATMAN - GOTHAM BY GASLIGHT: EINE LIGA FÜR GERECHTIGKEIT Story: Andy Diggle Zeichnungen: Leandro Fernandez Inhalt: Batman: Gotham by Gaslight: A League for Justice 1-6 DELSEW005 220 S. | Softcover | € 29,-26.05.2026",
          rows: [
            { text: "BATMAN - GOTHAM BY GASLIGHT: EINE LIGA FÜR GERECHTIGKEIT Story: Andy Diggle Zeichnungen: Leandro Fernandez Inhalt: Batman: Gotham by Gaslight: A League for Justice 1-6 DELSEW005 220 S. | Softcover | € 29,-26.05.2026", items: [
              { text: "DELSEW005", x: 72, y: 120, width: 62, height: 11 },
              { text: "220", x: 142, y: 120, width: 18, height: 11 },
              { text: "S.", x: 164, y: 120, width: 10, height: 11 },
              { text: "|", x: 178, y: 120, width: 6, height: 11 },
              { text: "Softcover", x: 188, y: 120, width: 54, height: 11 },
              { text: "|", x: 246, y: 120, width: 6, height: 11 },
              { text: "€", x: 256, y: 120, width: 8, height: 11 },
              { text: "29,-", x: 268, y: 120, width: 26, height: 11 },
            ], xMin: 60, xMax: 300, y: 120, height: 11 },
          ],
          xMin: 60,
          xMax: 300,
          yTop: 125,
          yBottom: 114,
        },
        { text: "DDCHC127 220 S. | HC | ca. 21 x 32 cm | € 39,-09.06.2026", rows: [], xMin: 329, xMax: 535, yTop: 125, yBottom: 114 },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);
    const elseworld = analysis.anchors.find((anchor) => anchor.issueCode === "DELSEW005");

    expect(elseworld?.metadataBlock.text).toBe("DELSEW005 220 S. | Softcover | € 29,-");
    expect(elseworld?.titleRows.map((row) => row.text)).toEqual([
      "BATMAN - GOTHAM BY GASLIGHT:",
      "EINE LIGA FÜR GERECHTIGKEIT",
    ]);
    expect(elseworld?.contentText).toContain("A League for Justice 1-6");
  });

  it("should_collect_fragmented_right_column_titles_from_shared_rows", () => {
    const page: PdfLayoutPage = {
      pageNumber: 19,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
        {
          text: "EINE LIGA FÜR GERECHTIGKEIT DIE NEUE GESCHICHTE",
          items: [
            { text: "EINE", x: 60, y: 336, width: 28, height: 11 },
            { text: "LIGA", x: 92, y: 336, width: 28, height: 11 },
            { text: "FÜR", x: 124, y: 336, width: 22, height: 11 },
            { text: "GERECHTIGKEIT", x: 150, y: 336, width: 90, height: 11 },
            { text: "DIE", x: 320, y: 336, width: 18, height: 11 },
            { text: "NEUE", x: 342, y: 336, width: 30, height: 11 },
            { text: "GESCHICHTE", x: 376, y: 336, width: 78, height: 11 },
          ],
          xMin: 60,
          xMax: 454,
          y: 336,
          height: 11,
        },
        {
          text: "DES DC-UNIVERSUMS",
          items: [
            { text: "DES", x: 320, y: 312, width: 22, height: 11 },
            { text: "DC-UNIVERSUMS", x: 346, y: 312, width: 100, height: 11 },
          ],
          xMin: 320,
          xMax: 446,
          y: 312,
          height: 11,
        },
        { text: "Inhalt: New History of", items: [], xMin: 320, xMax: 430, y: 280, height: 11 },
        { text: "the DC Universe 1-4", items: [], xMin: 320, xMax: 450, y: 266, height: 11 },
        { text: "DDCHC127 220 S. | HC | ca. 21 x 32 cm | € 39,-09.06.2026", items: [], xMin: 329, xMax: 535, y: 120, height: 11 },
      ],
      blocks: [
        { text: "DDCHC127 220 S. | HC | ca. 21 x 32 cm | € 39,-09.06.2026", rows: [
          { text: "DDCHC127 220 S. | HC | ca. 21 x 32 cm | € 39,-09.06.2026", items: [], xMin: 329, xMax: 535, y: 120, height: 11 },
        ], xMin: 329, xMax: 535, yTop: 125, yBottom: 114 },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);
    const history = analysis.anchors.find((anchor) => anchor.issueCode === "DDCHC127");

    expect(history?.titleRows.map((row) => row.text)).toEqual([
      "DIE NEUE GESCHICHTE",
      "DES DC-UNIVERSUMS",
    ]);
    expect(history?.contentText).toContain("the DC Universe 1-4");
  });

  it("should_keep_title_rows_when_the_first_content_row_sits_farther_below_the_title", () => {
    const page: PdfLayoutPage = {
      pageNumber: 19,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 60, xMax: 180, y: 773, height: 11 },
        { text: "DIE NEUE GESCHICHTE", items: [], xMin: 320, xMax: 470, y: 349, height: 11 },
        { text: "DES DC-UNIVERSUMS", items: [], xMin: 320, xMax: 470, y: 325, height: 11 },
        { text: "Inhalt: New History of", items: [], xMin: 320, xMax: 430, y: 264, height: 11 },
        { text: "the DC Universe 1-4", items: [], xMin: 320, xMax: 450, y: 253, height: 11 },
        { text: "DDCHC127 220 S. | HC | ca. 21 x 32 cm | € 39,-09.06.2026", items: [], xMin: 329, xMax: 535, y: 120, height: 11 },
      ],
      blocks: [
        {
          text: "DDCHC127 220 S. | HC | ca. 21 x 32 cm | € 39,-09.06.2026",
          rows: [
            { text: "DDCHC127 220 S. | HC | ca. 21 x 32 cm | € 39,-09.06.2026", items: [], xMin: 329, xMax: 535, y: 120, height: 11 },
          ],
          xMin: 329,
          xMax: 535,
          yTop: 125,
          yBottom: 114,
        },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);
    const history = analysis.anchors.find((anchor) => anchor.issueCode === "DDCHC127");

    expect(history?.titleRows.map((row) => row.text)).toEqual([
      "DIE NEUE GESCHICHTE",
      "DES DC-UNIVERSUMS",
    ]);
    expect(history?.contentRows.map((row) => row.text)).toEqual([
      "Inhalt: New History of",
      "the DC Universe 1-4",
    ]);
  });

  it("should_attach_collection_context_to_lower_band_anchors", () => {
    const page: PdfLayoutPage = {
      pageNumber: 31,
      width: 567,
      height: 794,
      items: [],
      rows: [
        { text: "N E U H E I T E N", items: [], xMin: 54, xMax: 165, y: 773, height: 22 },
        { text: "DIE GROSSE SPIDER-MAN", items: [], xMin: 55, xMax: 260, y: 708, height: 30 },
        { text: "COLLECTION", items: [], xMin: 55, xMax: 178, y: 680, height: 30 },
        { text: "SPIDER-MAN & HULK", items: [], xMin: 55, xMax: 231, y: 349, height: 24 },
        { text: "Inhalt: Amazing Spider-Man 119-120", items: [], xMin: 55, xMax: 260, y: 310, height: 9 },
        { text: "DSMPW006 140 S. | Hardcover | € 19,-30.06.2026", items: [], xMin: 64, xMax: 269, y: 53, height: 11 },
      ],
      blocks: [
        { text: "DSMPW006 140 S. | Hardcover | € 19,-30.06.2026", rows: [], xMin: 64, xMax: 269, yTop: 59, yBottom: 48 },
      ],
    };

    const analysis = analyzePreviewImportLayoutPage(page);

    expect(analysis.anchors[0]?.titleText).toBe("SPIDER-MAN & HULK");
    expect(analysis.anchors[0]?.collectionTitleText).toBe("DIE GROSSE SPIDER-MAN COLLECTION");
  });
});
