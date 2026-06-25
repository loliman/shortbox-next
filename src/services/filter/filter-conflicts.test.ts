import { resolveFilterConflicts } from "./filter-conflicts";

describe("resolveFilterConflicts", () => {
  it("should_prioritize_onlyNewUsMaterial_when_both_only_and_exclude_flags_are_set", () => {
    const result = resolveFilterConflicts({
      onlyNewUsMaterial: true,
      excludeOnlyNewUsMaterial: true,
    });
    expect(result.onlyNewUsMaterial).toBe(true);
    expect(result.excludeOnlyNewUsMaterial).toBe(false);
  });

  it("should_keep_excludeOnlyNewUsMaterial_when_only_exclude_is_set", () => {
    const result = resolveFilterConflicts({
      onlyNewUsMaterial: false,
      excludeOnlyNewUsMaterial: true,
    });
    expect(result.onlyNewUsMaterial).toBe(false);
    expect(result.excludeOnlyNewUsMaterial).toBe(true);
  });

  it("should_keep_onlyNewUsMaterial_when_only_only_is_set", () => {
    const result = resolveFilterConflicts({
      onlyNewUsMaterial: true,
      excludeOnlyNewUsMaterial: false,
    });
    expect(result.onlyNewUsMaterial).toBe(true);
    expect(result.excludeOnlyNewUsMaterial).toBe(false);
  });

  it("should_keep_both_false_when_neither_is_set", () => {
    const result = resolveFilterConflicts({
      onlyNewUsMaterial: false,
      excludeOnlyNewUsMaterial: false,
    });
    expect(result.onlyNewUsMaterial).toBe(false);
    expect(result.excludeOnlyNewUsMaterial).toBe(false);
  });
});
