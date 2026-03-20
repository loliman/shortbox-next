import { describe, expect, it } from "vitest";
import { HierarchyLevel } from "../../../../util/hierarchy";
import { buildIssueCreateDefaultValues, mapIssueToEditorDefaultValues } from "./defaultValues";

describe("issue-editor default values", () => {
  it("builds create defaults from selected hierarchy level", () => {
    const rootDefaults = buildIssueCreateDefaultValues(undefined, undefined);
    expect(rootDefaults.series.publisher.name).toBe("");
    expect(rootDefaults.series.publisher.us).toBe(false);

    const publisherDefaults = buildIssueCreateDefaultValues(
      { publisher: { name: "Marvel", us: true } },
      HierarchyLevel.PUBLISHER
    );
    expect(publisherDefaults.series.publisher).toEqual({ name: "Marvel", us: true });

    const seriesDefaults = buildIssueCreateDefaultValues(
      {
        series: {
          title: "Spider-Man",
          volume: 2,
          publisher: { name: "Marvel", us: false },
        },
      },
      HierarchyLevel.SERIES
    );
    expect(seriesDefaults.series.title).toBe("Spider-Man");
    expect(seriesDefaults.series.volume).toBe(2);

    const issueDefaults = buildIssueCreateDefaultValues(
      {
        issue: {
          series: {
            title: "Spider-Man",
            volume: 3,
            publisher: { name: "Marvel", us: true },
          },
        },
      },
      HierarchyLevel.ISSUE
    );
    expect(issueDefaults.series.publisher.us).toBe(true);
  });

  it("maps issue data to editor defaults and supports copy mode", () => {
    const mapped = mapIssueToEditorDefaultValues(
      {
        title: "Issue 1",
        number: "1",
        variant: "B",
        pages: "44",
        comicguideid: "10",
        isbn: "isbn",
        series: {
          title: "Spider-Man",
          volume: 1,
          publisher: { name: "Marvel", us: true },
        },
        individuals: [{ name: "Peter", type: "WRITER" }],
        arcs: [{ title: "Civil War", type: "EVENT" }],
        stories: [
          {
            number: 1,
            title: "Story",
            individuals: [{ name: "A", type: "WRITER" }],
            appearances: [{ name: "B", type: "FEATURED" }],
            parent: {
              number: 2,
              title: "Other",
              issue: {
                number: "2",
                series: { title: "Spider-Man", volume: 1 },
              },
            },
          },
        ],
      },
      false
    );

    expect(mapped.pages).toBe(44);
    expect(mapped.comicguideid).toBe(10);
    expect(mapped.stories[0].exclusive).toBe(true);
    expect(mapped.stories[0].parent).toBeUndefined();
    expect(mapped.individuals[0]).toEqual({ name: "Peter", type: "WRITER" });

    const copied = mapIssueToEditorDefaultValues(
      {
        ...mapped,
        stories: [{ title: "A" }],
        individuals: [{ name: "X", type: "WRITER" }],
        arcs: [{ title: "Y" }],
      },
      true
    );

    expect(copied.variant).toBe("");
    expect(copied.isbn).toBe("");
    expect(copied.stories).toEqual([]);
    expect(copied.individuals).toEqual([]);
    expect(copied.arcs).toEqual([]);
    expect(copied.cover).toBeUndefined();
  });

  it("keeps parent links for non-exclusive stories on non-US issues", () => {
    const mapped = mapIssueToEditorDefaultValues(
      {
        title: "Issue 2",
        number: "2",
        series: {
          title: "Batman",
          volume: 1,
          publisher: { name: "DC", us: false },
        },
        stories: [
          {
            number: 3,
            title: "Main Story",
            parent: {
              number: 7,
              title: "Collection",
              issue: {
                number: "8",
                series: { title: "Batman", volume: 2 },
              },
            },
          },
        ],
      },
      false
    );

    expect(mapped.stories[0].exclusive).toBe(false);
    expect(mapped.stories[0].individuals).toBeUndefined();
    expect(mapped.stories[0].appearances).toBeUndefined();
    expect(mapped.stories[0].parent).toEqual({
      number: 7,
      title: "Collection",
      issue: {
        series: { title: "Batman", volume: 2 },
        number: "8",
      },
    });
  });
});
