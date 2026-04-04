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
      } as any)
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
      } as any)
    ).toBe("series.publisher.name");
  });

  it("finds the first story error path", () => {
    expect(
      findFirstErrorPath({
        stories: [
          undefined,
          {
            parent: {
              issue: {
                series: { title: "Pflichtfeld" },
              },
            },
          },
        ],
      } as any)
    ).toBe("stories.1.parent.issue.series.title");
  });
});
