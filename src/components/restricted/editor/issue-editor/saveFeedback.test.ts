import { buildIssueSaveSuccessMessage } from "./saveFeedback";

describe("buildIssueSaveSuccessMessage", () => {
  it("should_returnSingleIssueSuccess_when_noSeriesWasCreated", () => {
    expect(
      buildIssueSaveSuccessMessage({
        createdCount: 1,
        issueLabel: "Spider-Man #1",
        successMessage: " erfolgreich erstellt",
      })
    ).toBe("Spider-Man #1 erfolgreich erstellt");
  });

  it("should_appendAutoSeriesNote_when_seriesWasCreatedForSingleSave", () => {
    expect(
      buildIssueSaveSuccessMessage({
        createdCount: 1,
        issueLabel: "Spider-Man #1",
        successMessage: " erfolgreich erstellt",
        createdSeries: {
          title: "Spider-Man",
          volume: 3,
        },
      })
    ).toBe('Spider-Man #1 erfolgreich erstellt Serie "Spider-Man" Vol. 3 wurde automatisch angelegt.');
  });

  it("should_appendAutoSeriesNote_when_batchSaveCreatedSeries", () => {
    expect(
      buildIssueSaveSuccessMessage({
        createdCount: 4,
        issueLabel: "unused",
        successMessage: " erfolgreich erstellt",
        createdSeries: {
          title: "Ultimate Spider-Man",
          volume: 1,
        },
      })
    ).toBe(
      '4 Varianten erfolgreich gespeichert Serie "Ultimate Spider-Man" Vol. 1 wurde automatisch angelegt.'
    );
  });
});
