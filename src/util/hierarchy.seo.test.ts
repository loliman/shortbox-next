import { describe, it, expect } from "@jest/globals";
import { generateSeoUrl } from "@/src/util/hierarchy";
import type { SelectedRoot } from "@/src/types/domain";

describe("generateSeoUrl", () => {
  it("generates root URL for empty selection", () => {
    const result = generateSeoUrl({}, false);
    expect(result).toBe("/de/");

    const usResult = generateSeoUrl({}, true);
    expect(usResult).toBe("/us/");
  });

  it("generates publisher URL", () => {
    const selected: SelectedRoot = {
      us: false,
      publisher: { name: "Marvel" },
    };
    expect(generateSeoUrl(selected, false)).toBe("/de/marvel");
    expect(generateSeoUrl({ ...selected, us: true }, true)).toBe("/us/marvel");
  });

  it("generates series URL with all components", () => {
    const selected: SelectedRoot = {
      us: false,
      series: {
        title: "Amazing Spider-Man",
        volume: 1,
        startyear: 1963,
        publisher: { name: "Marvel" },
      },
    };
    const result = generateSeoUrl(selected, false);
    expect(result).toBe("/de/marvel/amazing-spider-man-1963-vol1");
  });

  it("generates series URL without year", () => {
    const selected: SelectedRoot = {
      us: false,
      series: {
        title: "Spider-Man",
        volume: 2,
        publisher: { name: "Marvel" },
      },
    };
    const result = generateSeoUrl(selected, false);
    expect(result).toBe("/de/marvel/spider-man-vol2");
  });

  it("generates issue URL without format/variant", () => {
    const selected: SelectedRoot = {
      us: false,
      issue: {
        number: "1",
        series: {
          title: "Amazing Spider-Man",
          volume: 1,
          startyear: 1963,
          publisher: { name: "Marvel" },
        },
      },
    };
    const result = generateSeoUrl(selected, false);
    expect(result).toBe("/de/marvel/amazing-spider-man-1963-vol1/1");
  });

  it("generates issue URL with format", () => {
    const selected: SelectedRoot = {
      us: false,
      issue: {
        number: "1",
        format: "Heft",
        series: {
          title: "Amazing Spider-Man",
          volume: 1,
          startyear: 1963,
          publisher: { name: "Marvel" },
        },
      },
    };
    const result = generateSeoUrl(selected, false);
    expect(result).toBe("/de/marvel/amazing-spider-man-1963-vol1/1/heft");
  });

  it("generates issue URL with format and variant", () => {
    const selected: SelectedRoot = {
      us: true,
      issue: {
        number: "1",
        format: "Comic",
        variant: "Variant A",
        series: {
          title: "Amazing Spider-Man",
          volume: 1,
          startyear: 1963,
          publisher: { name: "Marvel" },
        },
      },
    };
    const result = generateSeoUrl(selected, true);
    expect(result).toBe("/us/marvel/amazing-spider-man-1963-vol1/1/comic/variant-a");
  });

  it("handles special characters in names", () => {
    const selected: SelectedRoot = {
      us: false,
      publisher: { name: "Marvel's Comic Division" },
    };
    const result = generateSeoUrl(selected, false);
    expect(result).toContain("marvel");
  });

  it("handles URLs with locale switching", () => {
    const selected: SelectedRoot = {
      us: true,
      issue: {
        number: "100",
        series: {
          title: "Batman",
          volume: 1,
          startyear: 1963,
          publisher: { name: "DC Comics" },
        },
      },
    };
    const deResult = generateSeoUrl(selected, false);
    const usResult = generateSeoUrl(selected, true);

    expect(deResult).toMatch(/^\/de\//);
    expect(usResult).toMatch(/^\/us\//);
    expect(deResult).toContain("batman");
    expect(usResult).toContain("batman");
  });

  it("handles issue numbers with special characters", () => {
    const selected: SelectedRoot = {
      us: false,
      issue: {
        number: "1/2",
        series: {
          title: "Test",
          volume: 1,
          publisher: { name: "Test" },
        },
      },
    };
    const result = generateSeoUrl(selected, false);
    expect(result).toContain("%2F");
  });
});

