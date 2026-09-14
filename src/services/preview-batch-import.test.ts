import {
  buildStagedPreviewImport,
  syncStagedImportWithDatabase,
  type PreviewSeriesIssueMatcher,
} from "./preview-batch-import";
import type { PreviewImportQueue } from "../types/preview-import";

describe("preview-batch-import", () => {
  const mockMatcher: PreviewSeriesIssueMatcher = {
    findDeSeries: async (title: string) => {
      if (title.toLowerCase().includes("spider-man")) {
        return { id: 101, title: "Spider-Man (2025)", volume: 1, publisherName: "Panini - Marvel & Icon" };
      }
      return null;
    },
    issueExists: async (seriesId: string | number, number: string) => {
      return seriesId === 101 && number === "10";
    },
  };

  it("should_stageDraftsWithCorrectStatus_when_draftsClassified", async () => {
    const queue: PreviewImportQueue = {
      id: "q-1",
      fileName: "pv123.pdf",
      createdAt: "2026-09-13T00:00:00.000Z",
      updatedAt: "2026-09-13T00:00:00.000Z",
      drafts: [
        // 1. Existing series, new issue -> READY
        {
          id: "d-1",
          sourceTitle: "SPIDER-MAN 11",
          issueCode: "DAMSM011",
          status: "pending",
          warnings: [],
          values: {
            title: "Spider-Man",
            series: { title: "Spider-Man", volume: 1, publisher: { name: "Panini", us: false } },
            number: "11",
            variant: "",
            cover: null,
            format: "Heft",
            releasedate: "2026-10-13",
            price: "5,99",
            individuals: [],
            addinfo: "",
            stories: [{ parent: { issue: { series: { title: "Amazing Spider-Man (2025)" }, number: "21" } } }],
            copyBatch: { enabled: false, count: 1, prefix: "" },
          },
        },
        // 2. Existing series, existing issue -> DUPLICATE
        {
          id: "d-2",
          sourceTitle: "SPIDER-MAN 10",
          issueCode: "DAMSM010",
          status: "pending",
          warnings: [],
          values: {
            title: "Spider-Man",
            series: { title: "Spider-Man", volume: 1, publisher: { name: "Panini", us: false } },
            number: "10",
            variant: "",
            cover: null,
            format: "Heft",
            releasedate: "2026-09-15",
            price: "5,99",
            individuals: [],
            addinfo: "",
            stories: [],
            copyBatch: { enabled: false, count: 1, prefix: "" },
          },
        },
        // 3. Brand new series -> NEW_SERIES
        {
          id: "d-3",
          sourceTitle: "WADE WILSON: DEADPOOL 1",
          issueCode: "DWWDP001",
          status: "pending",
          warnings: [],
          values: {
            title: "Wade Wilson: Deadpool",
            series: { title: "Wade Wilson: Deadpool", volume: 1, publisher: { name: "Panini", us: false } },
            number: "1",
            variant: "",
            cover: null,
            format: "Heft",
            releasedate: "2026-12-22",
            price: "4,99",
            individuals: [],
            addinfo: "",
            stories: [{ parent: { issue: { series: { title: "Wade Wilson: Deadpool (2026)" }, number: "1" } } }],
            copyBatch: { enabled: false, count: 1, prefix: "" },
          },
        },
        // 4. DC item -> out of scope
        {
          id: "d-4",
          sourceTitle: "ABSOLUTE BATMAN 6",
          issueCode: "DABSBA006",
          status: "pending",
          warnings: [],
          values: {
            title: "Absolute Batman",
            series: { title: "Absolute Batman", volume: 1, publisher: { name: "Panini", us: false } },
            number: "6",
            variant: "",
            cover: null,
            format: "Softcover",
            releasedate: "2026-10-06",
            price: "9,99",
            individuals: [],
            addinfo: "",
            stories: [],
            copyBatch: { enabled: false, count: 1, prefix: "" },
          },
        },
      ],
    };

    const staged = await buildStagedPreviewImport({
      queue,
      previewNumber: 123,
      matcher: mockMatcher,
    });

    expect(staged.previewNumber).toBe(123);
    expect(staged.totalDrafts).toBe(4);
    expect(staged.inScopeDrafts).toBe(3);
    expect(staged.readyCount).toBe(1);
    expect(staged.newSeriesCount).toBe(1);
    expect(staged.duplicateCount).toBe(1);

    // Check d-1 (Spider-Man 11)
    const s1 = staged.drafts.find((d) => d.id === "d-1")!;
    expect(s1.status).toBe("READY");
    expect(s1.selected).toBe(true);
    expect(s1.series.isNew).toBe(false);
    expect(s1.series.id).toBe(101);

    // Check d-2 (Spider-Man 10 - Duplicate)
    const s2 = staged.drafts.find((d) => d.id === "d-2")!;
    expect(s2.status).toBe("DUPLICATE");
    expect(s2.selected).toBe(false);

    // Check d-3 (Deadpool - New Series)
    const s3 = staged.drafts.find((d) => d.id === "d-3")!;
    expect(s3.status).toBe("NEW_SERIES");
    expect(s3.selected).toBe(true);
    expect(s3.series.isNew).toBe(true);

    // Check d-4 (DC - out of scope)
    const s4 = staged.drafts.find((d) => d.id === "d-4")!;
    expect(s4.inScope).toBe(false);
    expect(s4.selected).toBe(false);
  });

  it("should_markImportedIssuesAsCommitted_when_syncStagedImportWithDatabaseRuns", async () => {
    const queue: PreviewImportQueue = {
      id: "q-1",
      fileName: "pv123.pdf",
      createdAt: "2026-09-13T00:00:00.000Z",
      updatedAt: "2026-09-13T00:00:00.000Z",
      drafts: [
        {
          id: "d-1",
          sourceTitle: "SPIDER-MAN 11",
          status: "pending",
          warnings: [],
          values: {
            title: "Spider-Man",
            series: { title: "Spider-Man", volume: 1, publisher: { name: "Panini", us: false } },
            number: "11",
            variant: "",
            cover: null,
            format: "Heft",
            releasedate: "2026-10-13",
            price: "5,99",
            individuals: [],
            addinfo: "",
            stories: [],
            copyBatch: { enabled: false, count: 1, prefix: "" },
          },
        },
        {
          id: "d-3",
          sourceTitle: "WADE WILSON: DEADPOOL 1",
          status: "pending",
          warnings: [],
          values: {
            title: "Wade Wilson: Deadpool",
            series: { title: "Wade Wilson: Deadpool", volume: 1, publisher: { name: "Panini", us: false } },
            number: "1",
            variant: "",
            cover: null,
            format: "Heft",
            releasedate: "2026-12-22",
            price: "4,99",
            individuals: [],
            addinfo: "",
            stories: [],
            copyBatch: { enabled: false, count: 1, prefix: "" },
          },
        },
      ],
    };

    const staged = await buildStagedPreviewImport({
      queue,
      previewNumber: 123,
      matcher: mockMatcher,
    });

    expect(staged.drafts[0].status).toBe("READY");
    expect(staged.drafts[0].selected).toBe(true);

    // Now simulate that Spider-Man 11 was imported into DB
    const updatedMatcher: PreviewSeriesIssueMatcher = {
      findDeSeries: async (title: string) => {
        if (title.toLowerCase().includes("spider-man")) {
          return { id: 101, title: "Spider-Man (2025)", volume: 1, publisherName: "Panini - Marvel & Icon" };
        }
        return null;
      },
      issueExists: async (seriesId: string | number, number: string) => {
        // Spider-Man 11 is now in DB!
        return seriesId === 101 && (number === "10" || number === "11");
      },
    };

    await syncStagedImportWithDatabase(staged, updatedMatcher);

    expect(staged.drafts[0].status).toBe("COMMITTED");
    expect(staged.drafts[0].selected).toBe(false);
    expect(staged.readyCount).toBe(0);
    expect(staged.newSeriesCount).toBe(1);
    expect(staged.drafts[1].status).toBe("NEW_SERIES");
    expect(staged.drafts[1].selected).toBe(true);
  });
});

