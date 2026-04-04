import { buildIssueMetadataParts } from "./issue-metadata";

describe("issue-metadata", () => {
  it("builds detailed metadata with canonical urls when all canonical parts are present", () => {
    expect(
      buildIssueMetadataParts(
        {
          number: "1",
          format: "Hardcover",
          variant: "Sketch",
          series: {
            title: "Marvel Horror Classic Collection",
            startyear: 2022,
            volume: 1,
            publisher: {
              name: "Panini Marvel & Icon",
            },
          },
        },
        "de"
      )
    ).toEqual({
      title: "Marvel Horror Classic Collection (2022) #1 - Hardcover Sketch",
      description:
        "Marvel Horror Classic Collection #1: Format, Variante, Storys und Publikationsdetails in Shortbox auf einen Blick.",
      canonical:
        "/de/panini-marvel-icon/marvel-horror-classic-collection-2022-vol1/1/hardcover/sketch",
    });
  });

  it("omits canonical urls when required routing parts are missing and falls back to generic metadata", () => {
    expect(buildIssueMetadataParts(null, "us")).toEqual({
      title: "Heftdetails",
      description:
        "Comic-Heftdetails in Shortbox mit Format, Variante, Story-Informationen und weiterfuehrenden Metadaten.",
      canonical: undefined,
    });

    expect(
      buildIssueMetadataParts(
        {
          number: "5",
          series: {
            title: "Tomb of Dracula",
            volume: null,
            publisher: {
              name: "Marvel Comics",
            },
          },
        },
        "us"
      )
    ).toEqual({
      title: "Tomb of Dracula #5",
      description:
        "Tomb of Dracula #5: Format, Variante, Storys und Publikationsdetails in Shortbox auf einen Blick.",
      canonical: undefined,
    });
  });
});
