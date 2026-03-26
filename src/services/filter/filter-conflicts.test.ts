import { resolveFilterConflicts } from "./filter-conflicts";

describe("resolveFilterConflicts", () => {
  describe("negatable pairs", () => {
    it("positive flag takes precedence when both are set", () => {
      const result = resolveFilterConflicts({ firstPrint: true, notFirstPrint: true });
      expect(result.firstPrint).toBe(true);
      expect(result.notFirstPrint).toBe(false);
    });

    it("negative flag is applied when positive is false", () => {
      const result = resolveFilterConflicts({ firstPrint: false, notFirstPrint: true });
      expect(result.firstPrint).toBe(false);
      expect(result.notFirstPrint).toBe(true);
    });

    it("both are false when neither is set", () => {
      const result = resolveFilterConflicts({});
      expect(result.firstPrint).toBe(false);
      expect(result.notFirstPrint).toBe(false);
    });

    it("resolves all negatable pairs independently", () => {
      const result = resolveFilterConflicts({
        onlyPrint: true,
        notOnlyPrint: true,
        onlyTb: false,
        notOnlyTb: true,
        exclusive: true,
        notExclusive: false,
        reprint: false,
        notReprint: false,
        otherOnlyTb: true,
        notOtherOnlyTb: true,
        onlyOnePrint: false,
        notOnlyOnePrint: true,
        noPrint: false,
        notNoPrint: false,
      });

      // positive wins
      expect(result.onlyPrint).toBe(true);
      expect(result.notOnlyPrint).toBe(false);
      // negative applies when positive is false
      expect(result.onlyTb).toBe(false);
      expect(result.notOnlyTb).toBe(true);
      // positive alone
      expect(result.exclusive).toBe(true);
      expect(result.notExclusive).toBe(false);
      // both false
      expect(result.reprint).toBe(false);
      expect(result.notReprint).toBe(false);
      // positive wins
      expect(result.otherOnlyTb).toBe(true);
      expect(result.notOtherOnlyTb).toBe(false);
      // negative alone
      expect(result.onlyOnePrint).toBe(false);
      expect(result.notOnlyOnePrint).toBe(true);
      // both false
      expect(result.noPrint).toBe(false);
      expect(result.notNoPrint).toBe(false);
    });
  });

  describe("collection mode prioritization", () => {
    it("onlyCollected wins when all three are set", () => {
      const result = resolveFilterConflicts({
        onlyCollected: true,
        onlyNotCollected: true,
        onlyNotCollectedNoOwnedVariants: true,
      });
      expect(result.onlyCollected).toBe(true);
      expect(result.onlyNotCollected).toBe(false);
      expect(result.onlyNotCollectedNoOwnedVariants).toBe(false);
    });

    it("onlyNotCollectedNoOwnedVariants wins over onlyNotCollected when onlyCollected is false", () => {
      const result = resolveFilterConflicts({
        onlyCollected: false,
        onlyNotCollected: true,
        onlyNotCollectedNoOwnedVariants: true,
      });
      expect(result.onlyCollected).toBe(false);
      expect(result.onlyNotCollected).toBe(false);
      expect(result.onlyNotCollectedNoOwnedVariants).toBe(true);
    });

    it("onlyNotCollected applies when it is the only mode set", () => {
      const result = resolveFilterConflicts({ onlyNotCollected: true });
      expect(result.onlyCollected).toBe(false);
      expect(result.onlyNotCollected).toBe(true);
      expect(result.onlyNotCollectedNoOwnedVariants).toBe(false);
    });

    it("all collection modes are false when none are set", () => {
      const result = resolveFilterConflicts({});
      expect(result.onlyCollected).toBe(false);
      expect(result.onlyNotCollected).toBe(false);
      expect(result.onlyNotCollectedNoOwnedVariants).toBe(false);
    });
  });

  describe("defaults for missing input", () => {
    it("returns all false for empty input", () => {
      const result = resolveFilterConflicts({});
      const allFalse = Object.values(result).every((v) => v === false);
      expect(allFalse).toBe(true);
    });
  });
});

