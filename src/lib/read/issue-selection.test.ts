import { matchesIssueSelectionBySlug, type IssueSelectionInput, type IssueSelectionCandidate } from "./issue-selection";

describe("matchesIssueSelectionBySlug - series slug year collision resolution", () => {
  const baseSelection: IssueSelectionInput = {
    us: true,
    publisher: "Marvel",
    series: "Iron Man",
    volume: 1,
    startyear: 2020,
    number: "1",
  };

  const makeCandidate = (
    title: string,
    startYear: number,
    volume: number = 1
  ): IssueSelectionCandidate => ({
    number: "1",
    series: {
      title,
      volume,
      startYear: BigInt(startYear),
      publisher: {
        name: "Marvel",
        original: true,
      },
    },
  });

  it("should match standard series without year collision", () => {
    const selection = { ...baseSelection, series: "Amazing Spider-Man", startyear: 1963 };
    const candidate = makeCandidate("Amazing Spider-Man", 1963);

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(true);
  });

  it("should match series title ending in year when selection startyear is extracted from the slug (year collision)", () => {
    // Selection has parsed title "Iron Man" and startyear 2020 (extracted from "iron-man-2020-vol1")
    const selection = { ...baseSelection, series: "Iron Man", startyear: 2020 };
    
    // Candidate in database actually has title "Iron Man 2020" and startYear 0 (or null)
    const candidate = makeCandidate("Iron Man 2020", 0);

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(true);
  });

  it("should match standard series that has startYear equal to the selection year", () => {
    // Selection has parsed title "Iron Man" and startyear 2020
    const selection = { ...baseSelection, series: "Iron Man", startyear: 2020 };
    
    // Candidate in database has title "Iron Man" and startYear 2020
    const candidate = makeCandidate("Iron Man", 2020);

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(true);
  });

  it("should not match when there is a volume mismatch", () => {
    const selection = { ...baseSelection, series: "Iron Man", startyear: 2020, volume: 2 };
    const candidate = makeCandidate("Iron Man 2020", 0, 1);

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(false);
  });

  it("should not match when there is a title/year slug mismatch", () => {
    const selection = { ...baseSelection, series: "Iron Man", startyear: 2015 };
    const candidate = makeCandidate("Iron Man 2020", 0);

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(false);
  });
});
