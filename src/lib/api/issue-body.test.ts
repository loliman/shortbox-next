import { validateDeleteIssueBody, validateEditIssueBody } from "./issue-body";

describe("validateEditIssueBody", () => {
  it("should_preserve_collected_and_verified_flags_when_validating_issue_edits", async () => {
    const result = await validateEditIssueBody({
      item: {
        id: "123",
        number: "1",
        format: "",
        series: {
          title: "Batman",
          volume: 1,
          publisher: {
            name: "Panini",
          },
        },
        collected: true,
        verified: false,
      },
    });

    expect(result.item.collected).toBe(true);
    expect(result.item.verified).toBe(false);
  });
});

describe("validateDeleteIssueBody", () => {
  it("should_strip_detail_only_variants_when_validating_issue_delete_lookup", async () => {
    const result = await validateDeleteIssueBody({
      item: {
        id: "123",
        number: "1",
        format: null,
        variant: null,
        variants: null,
        series: {
          title: "Batman",
          volume: 1,
          publisher: {
            name: "Panini",
            us: null,
          },
        },
      },
    });

    expect((result.item as Record<string, unknown>).variants).toBeUndefined();
  });
});
