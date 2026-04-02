import { describe, expect, it } from "@jest/globals";
import {
  doesIssueNodeMatchSelectedIssueRoute,
  doesSeriesNodeMatchIssueSeries,
  getSelectedSeriesKey,
  getSeriesKey,
  isSelectedIssue,
} from "./listTreeUtils";

describe("listTreeUtils", () => {
  it("builds matching series keys for SEO-selected and DB-backed series titles", () => {
    const selectedKey = getSelectedSeriesKey({
      issue: {
        number: "100",
        series: {
          title: "Spider Man",
          startyear: 2004,
          volume: 2,
          publisher: { name: "Panini Marvel Icon" },
        },
      },
    } as any);

    const nodeKey = getSeriesKey({
      title: "Spider-Man",
      startyear: 2004,
      volume: 2,
      publisher: { name: "Panini Marvel Icon" },
    });

    expect(selectedKey).toBe(nodeKey);
  });

  it("builds distinct series keys when only the startyear differs", () => {
    expect(
      getSeriesKey({
        title: "What If",
        startyear: 1977,
        volume: 1,
        publisher: { name: "Marvel Comics" },
      })
    ).not.toBe(
      getSeriesKey({
        title: "What If",
        startyear: 1989,
        volume: 1,
        publisher: { name: "Marvel Comics" },
      })
    );
  });

  it("matches series nodes against SEO-selected issue series by slug equivalence", () => {
    expect(
      doesSeriesNodeMatchIssueSeries(
        {
          title: "Die Marvel-Superhelden-Sammlung",
          volume: 1,
          publisher: { name: "Hachette" },
        },
        {
          title: "Die Marvel Superhelden Sammlung",
          volume: 1,
          publisher: { name: "Hachette" },
        } as any
      )
    ).toBe(true);
  });

  it("keeps issue rows selected when only the series title differs by SEO slug normalization", () => {
    expect(
      isSelectedIssue(
        {
          number: "100",
          series: {
            title: "Spider-Man",
            volume: 2,
            publisher: { name: "Panini Marvel Icon" },
          },
        },
        {
          number: "100",
          format: "Heft",
          variant: "Analph Comics Zürich",
          series: {
            title: "Spider Man",
            startyear: 2004,
            volume: 2,
            publisher: { name: "Panini Marvel Icon" },
          },
        } as any,
        {
          title: "Spider-Man",
          volume: 2,
          publisher: { name: "Panini Marvel Icon" },
        }
      )
    ).toBe(true);
  });

  it("matches grouped issue rows for non-primary selected variants", () => {
    expect(
      doesIssueNodeMatchSelectedIssueRoute(
        {
          number: "126",
          format: "Heft",
          variant: "Comicshop Ausgabe",
          variants: [
            { format: "Heft", variant: "Comicshop Ausgabe" },
            { format: "Heft", variant: "Kiosk Ausgabe" },
          ],
          series: {
            title: "Star Wars",
            volume: 2,
            startyear: 2021,
            publisher: { name: "Panini - Star Wars & Generation" },
          },
        },
        {
          number: "126",
          format: "Heft",
          variant: "Kiosk Ausgabe",
          series: {
            title: "Star Wars",
            volume: 2,
            startyear: 2021,
            publisher: { name: "Panini - Star Wars & Generation" },
          },
        } as any
      )
    ).toBe(true);
  });
});
