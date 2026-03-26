import { resolveNegatablePair, resolveCollectionMode } from "./filter-conflict-resolution";

describe("filter-conflict-resolution", () => {
  describe("resolveNegatablePair", () => {
    it("returns [true, false] when positive is truthy", () => {
      expect(resolveNegatablePair(true, true)).toEqual([true, false]);
      expect(resolveNegatablePair(1, true)).toEqual([true, false]);
      expect(resolveNegatablePair("yes", true)).toEqual([true, false]);
    });

    it("returns [false, true] when positive is falsy and negative is truthy", () => {
      expect(resolveNegatablePair(false, true)).toEqual([false, true]);
      expect(resolveNegatablePair(0, true)).toEqual([false, true]);
      expect(resolveNegatablePair(null, true)).toEqual([false, true]);
      expect(resolveNegatablePair(undefined, true)).toEqual([false, true]);
    });

    it("returns [false, false] when both are falsy", () => {
      expect(resolveNegatablePair(false, false)).toEqual([false, false]);
      expect(resolveNegatablePair(null, undefined)).toEqual([false, false]);
      expect(resolveNegatablePair(0, "")).toEqual([false, false]);
    });

    it("returns [false, false] when negative is falsy (regardless of positive)", () => {
      expect(resolveNegatablePair(true, false)).toEqual([true, false]);
      expect(resolveNegatablePair(true, null)).toEqual([true, false]);
      expect(resolveNegatablePair(true, undefined)).toEqual([true, false]);
    });
  });

  describe("resolveCollectionMode", () => {
    it("prioritizes onlyCollected over other modes", () => {
      const result = resolveCollectionMode(true, true, true);
      expect(result).toEqual({
        onlyCollected: true,
        onlyNotCollected: false,
        onlyNotCollectedNoOwnedVariants: false,
      });
    });

    it("prioritizes onlyNotCollectedNoOwnedVariants when onlyCollected is false", () => {
      const result = resolveCollectionMode(false, true, true);
      expect(result).toEqual({
        onlyCollected: false,
        onlyNotCollected: false,
        onlyNotCollectedNoOwnedVariants: true,
      });
    });

    it("applies onlyNotCollected when higher-priority modes are false", () => {
      const result = resolveCollectionMode(false, true, false);
      expect(result).toEqual({
        onlyCollected: false,
        onlyNotCollected: true,
        onlyNotCollectedNoOwnedVariants: false,
      });
    });

    it("returns all false when no mode is selected", () => {
      const result = resolveCollectionMode(false, false, false);
      expect(result).toEqual({
        onlyCollected: false,
        onlyNotCollected: false,
        onlyNotCollectedNoOwnedVariants: false,
      });
    });

    it("treats falsy values (0, '', null) correctly", () => {
      const result = resolveCollectionMode(null, undefined, 0);
      expect(result).toEqual({
        onlyCollected: false,
        onlyNotCollected: false,
        onlyNotCollectedNoOwnedVariants: false,
      });
    });

    it("handles numeric truthy values", () => {
      const result = resolveCollectionMode(1, true, true);
      expect(result).toEqual({
        onlyCollected: true,
        onlyNotCollected: false,
        onlyNotCollectedNoOwnedVariants: false,
      });
    });
  });
});

