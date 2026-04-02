import {
  buildVariantBatchLabels,
  normalizeIssueCopyBatch,
  shouldGenerateVariantBatch,
} from "./issue-copy";

describe("issue-copy-service", () => {
  it("should_build_variant_labels_with_prefix_when_batch_prefix_is_given", () => {
    expect(buildVariantBatchLabels({ count: 3, prefix: "Panini Exclusive" })).toEqual([
      "Panini Exclusive A",
      "Panini Exclusive B",
      "Panini Exclusive C",
    ]);
  });

  it("should_build_plain_a_to_z_labels_when_no_prefix_is_given", () => {
    expect(buildVariantBatchLabels({ count: 3 })).toEqual(["A", "B", "C"]);
  });

  it("should_detect_auto_generation_only_when_batch_mode_is_enabled", () => {
    expect(
      shouldGenerateVariantBatch({ enabled: true, count: 1, prefix: "Panini Exclusive" })
    ).toBe(true);
    expect(shouldGenerateVariantBatch({ count: 1, prefix: "Panini Exclusive" })).toBe(false);
  });

  it("should_normalize_empty_batch_to_single_variant_defaults", () => {
    expect(normalizeIssueCopyBatch()).toEqual({ count: 1, prefix: "" });
  });

  it("should_throw_when_batch_count_exceeds_alphabet", () => {
    expect(() => normalizeIssueCopyBatch({ count: 27 })).toThrow("Anzahl muss zwischen 1 und 26 liegen");
  });
});
