import {
  applyPdfTextRunStylesToRows,
  clusterPdfRowsToBlocks,
  clusterPdfTextRows,
} from "./pdf-layout";

describe("pdf-layout", () => {
  it("should_cluster_items_into_rows_when_their_y_positions_are_close", () => {
    const rows = clusterPdfTextRows([
      { text: "BATMAN", x: 20, y: 100, width: 40, height: 10 },
      { text: "7", x: 70, y: 99.2, width: 8, height: 10 },
      { text: "Inhalt:", x: 20, y: 80, width: 30, height: 10 },
      { text: "Batman 40-44", x: 60, y: 80.4, width: 80, height: 10 },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.text).toBe("BATMAN 7");
    expect(rows[1]?.text).toBe("Inhalt: Batman 40-44");
  });

  it("should_cluster_rows_into_separate_blocks_when_columns_do_not_overlap", () => {
    const rows = clusterPdfTextRows([
      { text: "BATMAN", x: 20, y: 200, width: 40, height: 10 },
      { text: "4", x: 70, y: 200, width: 8, height: 10 },
      { text: "Inhalt:", x: 20, y: 182, width: 30, height: 10 },
      { text: "Batman 20-24", x: 60, y: 182, width: 80, height: 10 },
      { text: "WORLD'S", x: 260, y: 200, width: 60, height: 10 },
      { text: "FINEST 7", x: 325, y: 200, width: 55, height: 10 },
      { text: "Inhalt:", x: 260, y: 182, width: 30, height: 10 },
      { text: "World's Finest 40-44", x: 300, y: 182, width: 120, height: 10 },
    ]);

    const blocks = clusterPdfRowsToBlocks(rows);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.text).toContain("BATMAN 4");
    expect(blocks[1]?.text).toContain("WORLD'S FINEST 7");
  });

  it("should_keep_stacked_rows_in_the_same_block_when_they_share_horizontal_space", () => {
    const rows = clusterPdfTextRows([
      { text: "TITANS 6:", x: 20, y: 160, width: 60, height: 10 },
      { text: "DEATHSTROKES RUECKKEHR", x: 20, y: 144, width: 140, height: 10 },
      { text: "Inhalt:", x: 20, y: 126, width: 30, height: 10 },
      { text: "Titans 22-27, Titans Annual 2025", x: 60, y: 126, width: 200, height: 10 },
    ]);

    const blocks = clusterPdfRowsToBlocks(rows);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.rows).toHaveLength(3);
  });

  it("should_apply_styled_text_runs_to_rows_when_a_row_contains_multiple_colored_segments", () => {
    const rows = clusterPdfTextRows([
      { text: "DC MUST-HAVE: BATMAN &", x: 20, y: 100, width: 140, height: 10 },
      { text: "SUPERMAN: SUPERGIRL", x: 20, y: 82, width: 130, height: 10 },
    ]);

    const styledRows = applyPdfTextRunStylesToRows(rows, [
      { text: "DC MUST-HAVE:", fillColor: "#2c2e35", fontName: "prefix" },
      { text: "BATMAN &", fillColor: "#0097d8", fontName: "title" },
      { text: "SUPERMAN: SUPERGIRL", fillColor: "#0097d8", fontName: "title" },
    ]);

    expect(styledRows[0]?.items.map((item) => ({
      text: item.text,
      fillColor: item.fillColor,
    }))).toEqual([
      { text: "DC MUST-HAVE:", fillColor: "#2c2e35" },
      { text: "BATMAN &", fillColor: "#0097d8" },
    ]);
    expect(styledRows[1]?.items.map((item) => ({
      text: item.text,
      fillColor: item.fillColor,
    }))).toEqual([
      { text: "SUPERMAN: SUPERGIRL", fillColor: "#0097d8" },
    ]);
  });
});
