import { buildTouchedFromErrors, findFirstErrorPath } from "./validationFeedback";

describe("validationFeedback", () => {
  it("builds a touched tree from nested errors", () => {
    expect(
      buildTouchedFromErrors({
        series: {
          publisher: { name: "Pflichtfeld" },
          title: "Pflichtfeld",
        },
        stories: [{ number: "Pflichtfeld" }],
      })
    ).toEqual({
      series: {
        publisher: { name: true },
        title: true,
      },
      stories: [{ number: true }],
    });
  });

  it("finds the first nested error path", () => {
    expect(
      findFirstErrorPath({
        series: {
          publisher: { name: "Pflichtfeld" },
          title: "Pflichtfeld",
        },
      })
    ).toBe("series.publisher.name");
  });
});
