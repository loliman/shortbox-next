import { describe, expect, it } from "@jest/globals";
import { matchesPublisherSelectionBySlug } from "./publisher-selection";

describe("publisher-selection", () => {
  it("matches acronym casing via slug equivalence", () => {
    const candidate = {
      name: "BSV",
      original: false,
    };

    expect(
      matchesPublisherSelectionBySlug(candidate, {
        us: false,
        publisher: "Bsv",
      })
    ).toBe(true);
  });

  it("matches umlaut/transliteration equivalence", () => {
    const candidate = {
      name: "Müller Verlag",
      original: false,
    };

    expect(
      matchesPublisherSelectionBySlug(candidate, {
        us: false,
        publisher: "Mueller Verlag",
      })
    ).toBe(true);
  });

  it("does not match when locale flag differs", () => {
    const candidate = {
      name: "Marvel",
      original: true,
    };

    expect(
      matchesPublisherSelectionBySlug(candidate, {
        us: false,
        publisher: "Marvel",
      })
    ).toBe(false);
  });
});

