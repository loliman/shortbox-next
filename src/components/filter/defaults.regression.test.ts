/**
 * Regression tests for conflict resolution refactoring
 * Verifies that extracted conflict resolution logic maintains exact parity with original behavior
 */

import { parseFilterValues } from "../../components/filter/defaults";

describe("filter conflict resolution regression", () => {
  describe("negatable pair resolution (positive takes precedence)", () => {
    it("resolves firstPrint/notFirstPrint pairs correctly", () => {
      const withFirstPrint = parseFilterValues(
        JSON.stringify({ firstPrint: true, notFirstPrint: true })
      );
      expect(withFirstPrint.firstPrint).toBe(true);
      expect(withFirstPrint.notFirstPrint).toBe(false);

      const withNotFirstPrint = parseFilterValues(
        JSON.stringify({ firstPrint: false, notFirstPrint: true })
      );
      expect(withNotFirstPrint.firstPrint).toBe(false);
      expect(withNotFirstPrint.notFirstPrint).toBe(true);
    });

    it("resolves onlyPrint/notOnlyPrint pairs correctly", () => {
      const withOnlyPrint = parseFilterValues(
        JSON.stringify({ onlyPrint: true, notOnlyPrint: true })
      );
      expect(withOnlyPrint.onlyPrint).toBe(true);
      expect(withOnlyPrint.notOnlyPrint).toBe(false);
    });

    it("resolves onlyTb/notOnlyTb pairs correctly", () => {
      const withOnlyTb = parseFilterValues(
        JSON.stringify({ onlyTb: true, notOnlyTb: true })
      );
      expect(withOnlyTb.onlyTb).toBe(true);
      expect(withOnlyTb.notOnlyTb).toBe(false);
    });

    it("resolves exclusive/notExclusive pairs correctly", () => {
      const withExclusive = parseFilterValues(
        JSON.stringify({ exclusive: true, notExclusive: true })
      );
      expect(withExclusive.exclusive).toBe(true);
      expect(withExclusive.notExclusive).toBe(false);
    });

    it("resolves reprint/notReprint pairs correctly", () => {
      const withReprint = parseFilterValues(
        JSON.stringify({ reprint: true, notReprint: true })
      );
      expect(withReprint.reprint).toBe(true);
      expect(withReprint.notReprint).toBe(false);
    });

    it("resolves otherOnlyTb/notOtherOnlyTb pairs correctly", () => {
      const withOtherOnlyTb = parseFilterValues(
        JSON.stringify({ otherOnlyTb: true, notOtherOnlyTb: true })
      );
      expect(withOtherOnlyTb.otherOnlyTb).toBe(true);
      expect(withOtherOnlyTb.notOtherOnlyTb).toBe(false);
    });

    it("resolves onlyOnePrint/notOnlyOnePrint pairs correctly", () => {
      const withOnlyOnePrint = parseFilterValues(
        JSON.stringify({ onlyOnePrint: true, notOnlyOnePrint: true })
      );
      expect(withOnlyOnePrint.onlyOnePrint).toBe(true);
      expect(withOnlyOnePrint.notOnlyOnePrint).toBe(false);
    });

    it("resolves noPrint/notNoPrint pairs correctly", () => {
      const withNoPrint = parseFilterValues(
        JSON.stringify({ noPrint: true, notNoPrint: true })
      );
      expect(withNoPrint.noPrint).toBe(true);
      expect(withNoPrint.notNoPrint).toBe(false);
    });
  });

  describe("collection mode resolution (prioritization: onlyCollected > onlyNotCollectedNoOwnedVariants > onlyNotCollected)", () => {
    it("selects onlyCollected when all three are specified", () => {
      const parsed = parseFilterValues(
        JSON.stringify({
          onlyCollected: true,
          onlyNotCollected: true,
          onlyNotCollectedNoOwnedVariants: true,
        })
      );
      expect(parsed.onlyCollected).toBe(true);
      expect(parsed.onlyNotCollected).toBe(false);
      expect(parsed.onlyNotCollectedNoOwnedVariants).toBe(false);
    });

    it("selects onlyNotCollectedNoOwnedVariants when onlyCollected is false", () => {
      const parsed = parseFilterValues(
        JSON.stringify({
          onlyCollected: false,
          onlyNotCollected: true,
          onlyNotCollectedNoOwnedVariants: true,
        })
      );
      expect(parsed.onlyCollected).toBe(false);
      expect(parsed.onlyNotCollected).toBe(false);
      expect(parsed.onlyNotCollectedNoOwnedVariants).toBe(true);
    });

    it("selects onlyNotCollected when higher-priority modes are false", () => {
      const parsed = parseFilterValues(
        JSON.stringify({
          onlyCollected: false,
          onlyNotCollected: true,
          onlyNotCollectedNoOwnedVariants: false,
        })
      );
      expect(parsed.onlyCollected).toBe(false);
      expect(parsed.onlyNotCollected).toBe(true);
      expect(parsed.onlyNotCollectedNoOwnedVariants).toBe(false);
    });

    it("handles missing values correctly (treats as false)", () => {
      const parsed = parseFilterValues("{}");
      expect(parsed.onlyCollected).toBe(false);
      expect(parsed.onlyNotCollected).toBe(false);
      expect(parsed.onlyNotCollectedNoOwnedVariants).toBe(false);
    });

    it("prioritizes onlyCollected even with partial conflicts", () => {
      const parsed = parseFilterValues(
        JSON.stringify({
          onlyCollected: true,
          onlyNotCollectedNoOwnedVariants: true,
        })
      );
      expect(parsed.onlyCollected).toBe(true);
      expect(parsed.onlyNotCollectedNoOwnedVariants).toBe(false);
    });
  });

  describe("all flag combinations maintain backward compatibility", () => {
    it("handles complex flag combinations correctly", () => {
      const parsed = parseFilterValues(
        JSON.stringify({
          firstPrint: true,
          notFirstPrint: true,
          onlyPrint: false,
          notOnlyPrint: true,
          reprint: true,
          notReprint: true,
          onlyCollected: false,
          onlyNotCollected: true,
        })
      );

      // Negatable pairs
      expect(parsed.firstPrint).toBe(true);
      expect(parsed.notFirstPrint).toBe(false);
      expect(parsed.onlyPrint).toBe(false);
      expect(parsed.notOnlyPrint).toBe(true);
      expect(parsed.reprint).toBe(true);
      expect(parsed.notReprint).toBe(false);

      // Collection mode
      expect(parsed.onlyCollected).toBe(false);
      expect(parsed.onlyNotCollected).toBe(true);
      expect(parsed.onlyNotCollectedNoOwnedVariants).toBe(false);
    });
  });
});


