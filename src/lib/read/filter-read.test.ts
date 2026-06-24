import { buildDirectIssueFilterWhere, selectGroupRepresentatives } from "./filter-read";
import type { Filter } from "../../types/query-data";

type WhereWithAggregates = {
  AND?: Array<Record<string, unknown>>;
} & Record<string, unknown>;

function aggregateClauses(where: WhereWithAggregates | null): Array<Record<string, unknown>> {
  if (where == null) return [];
  const and = Array.isArray(where.AND) ? where.AND : [where];
  return and.filter((clause) => {
    if (clause == null || typeof clause !== "object") return false;
    return Object.keys(clause).some((key) => key.startsWith("has") || key === "isReprintOnly");
  });
}

function makeFilter(extra: Record<string, unknown>): Filter {
  return { us: false, ...extra } as Filter;
}

describe("buildDirectIssueFilterWhere – story flag filters", () => {
  it("should_return_non_null_when_only_print_flags_are_set", () => {
    const where = buildDirectIssueFilterWhere(makeFilter({ firstPrint: true }));
    expect(where).not.toBeNull();
  });

  it("should_emit_hasFirstPrint_true_for_firstPrint_switch", () => {
    const where = buildDirectIssueFilterWhere(makeFilter({ firstPrint: true })) as WhereWithAggregates;
    expect(aggregateClauses(where)).toEqual([{ hasFirstPrint: true }]);
  });

  it("should_emit_hasFirstPrint_false_for_notFirstPrint_switch", () => {
    const where = buildDirectIssueFilterWhere(makeFilter({ notFirstPrint: true })) as WhereWithAggregates;
    expect(aggregateClauses(where)).toEqual([{ hasFirstPrint: false }]);
  });

  it("should_emit_isReprintOnly_true_for_reprint_switch", () => {
    const where = buildDirectIssueFilterWhere(makeFilter({ reprint: true })) as WhereWithAggregates;
    expect(aggregateClauses(where)).toEqual([{ isReprintOnly: true }]);
  });

  it("should_emit_isReprintOnly_false_for_notReprint_switch", () => {
    const where = buildDirectIssueFilterWhere(makeFilter({ notReprint: true })) as WhereWithAggregates;
    expect(aggregateClauses(where)).toEqual([{ isReprintOnly: false }]);
  });

  it("should_emit_hasPrintStory_false_for_noPrint_switch", () => {
    const where = buildDirectIssueFilterWhere(makeFilter({ noPrint: true })) as WhereWithAggregates;
    expect(aggregateClauses(where)).toEqual([{ hasPrintStory: false }]);
  });

  it("should_emit_hasPrintStory_true_for_notNoPrint_switch", () => {
    const where = buildDirectIssueFilterWhere(makeFilter({ notNoPrint: true })) as WhereWithAggregates;
    expect(aggregateClauses(where)).toEqual([{ hasPrintStory: true }]);
  });

  it("should_combine_independent_switches_with_AND", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ reprint: true, notFirstPrint: true })
    ) as WhereWithAggregates;

    expect(aggregateClauses(where)).toEqual(
      expect.arrayContaining([{ isReprintOnly: true }, { hasFirstPrint: false }])
    );
  });

  it("should_combine_multiple_set_switches_in_AND", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ onlyTb: true, notExclusive: true, otherOnlyTb: true, contentFilterMode: "and" })
    ) as WhereWithAggregates;

    expect(aggregateClauses(where)).toEqual(
      expect.arrayContaining([
        { hasOnlyTb: true },
        { hasExclusiveStory: false },
        { hasOtherOnlyTb: true },
      ])
    );
  });

  it("should_combine_multiple_set_switches_in_OR_by_default", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ onlyTb: true, notExclusive: true, otherOnlyTb: true })
    ) as WhereWithAggregates;

    const orClause = where.AND?.find((c) => "OR" in c) as { OR: Array<Record<string, unknown>> } | undefined;
    expect(orClause).toBeDefined();
    expect(orClause!.OR).toEqual(
      expect.arrayContaining([{ hasOnlyTb: true }, { hasOtherOnlyTb: true }])
    );

    expect(where.AND).toContainEqual({ hasExclusiveStory: false });
  });

  it("should_map_each_print_flag_switch_to_its_aggregate_column", () => {
    const cases: Array<{ flag: string; expected: Record<string, boolean> }> = [
      { flag: "firstPrint", expected: { hasFirstPrint: true } },
      { flag: "notFirstPrint", expected: { hasFirstPrint: false } },
      { flag: "onlyPrint", expected: { hasOnlyPrint: true } },
      { flag: "notOnlyPrint", expected: { hasOnlyPrint: false } },
      { flag: "onlyTb", expected: { hasOnlyTb: true } },
      { flag: "notOnlyTb", expected: { hasOnlyTb: false } },
      { flag: "exclusive", expected: { hasExclusiveStory: true } },
      { flag: "notExclusive", expected: { hasExclusiveStory: false } },
      { flag: "reprint", expected: { isReprintOnly: true } },
      { flag: "notReprint", expected: { isReprintOnly: false } },
      { flag: "otherOnlyTb", expected: { hasOtherOnlyTb: true } },
      { flag: "notOtherOnlyTb", expected: { hasOtherOnlyTb: false } },
      { flag: "noPrint", expected: { hasPrintStory: false } },
      { flag: "notNoPrint", expected: { hasPrintStory: true } },
      { flag: "onlyOnePrint", expected: { hasOnlyOnePrint: true } },
      { flag: "notOnlyOnePrint", expected: { hasOnlyOnePrint: false } },
    ];

    for (const { flag, expected } of cases) {
      const where = buildDirectIssueFilterWhere(makeFilter({ [flag]: true })) as WhereWithAggregates;
      expect(aggregateClauses(where)).toEqual([expected]);
    }
  });
});

describe("buildDirectIssueFilterWhere – US story flag filters", () => {
  const makeUsFilter = (extra: Record<string, unknown>): Filter => {
    return { us: true, ...extra } as Filter;
  };

  const cases: Array<{ flag: string; expected: Record<string, unknown> }> = [
    { flag: "firstPrint", expected: { stories: { some: { firstApp: true } } } },
    { flag: "notFirstPrint", expected: { stories: { none: { firstApp: true } } } },
    { flag: "onlyPrint", expected: { stories: { some: { onlyApp: true } } } },
    { flag: "notOnlyPrint", expected: { stories: { none: { onlyApp: true } } } },
    { flag: "onlyTb", expected: { stories: { some: { onlyTb: true } } } },
    { flag: "notOnlyTb", expected: { stories: { none: { onlyTb: true } } } },
    { flag: "exclusive", expected: { stories: { some: { fkParent: null } } } },
    { flag: "notExclusive", expected: { stories: { none: { fkParent: null } } } },
    {
      flag: "reprint",
      expected: {
        stories: {
          some: {},
          none: { firstApp: true },
        },
      },
    },
    {
      flag: "notReprint",
      expected: {
        OR: [
          { stories: { none: {} } },
          { stories: { some: { firstApp: true } } },
        ],
      },
    },
    { flag: "otherOnlyTb", expected: { stories: { some: { otherOnlyTb: true } } } },
    { flag: "notOtherOnlyTb", expected: { stories: { none: { otherOnlyTb: true } } } },
    { flag: "noPrint", expected: { stories: { none: { children: { some: {} } } } } },
    { flag: "notNoPrint", expected: { stories: { some: { children: { some: {} } } } } },
    { flag: "onlyOnePrint", expected: { stories: { some: { onlyOnePrint: true } } } },
    { flag: "notOnlyOnePrint", expected: { stories: { none: { onlyOnePrint: true } } } },
  ];

  for (const { flag, expected } of cases) {
    it(`should_emit_correct_story_query_for_${flag}`, () => {
      const where = buildDirectIssueFilterWhere(makeUsFilter({ [flag]: true })) as { AND: Array<Record<string, unknown>> };
      expect(where.AND[0]).toEqual({ series: { publisher: { original: true } } });
      expect(where.AND[1]).toEqual(expected);
    });
  }
});

describe("buildDirectIssueFilterWhere – fallback gating", () => {
  it("should_return_null_for_custom_ID_list_filters", () => {
    const customFlags = [
      "crossPublishers",
      "crossSeries",
      "crossNumber",
      "crossVolume",
      "crossStartYear",
      "crossEndYear",
    ];
    for (const flag of customFlags) {
      const value = flag === "crossPublishers" || flag === "crossSeries" ? [{ name: "Marvel" }] : true;
      const where = buildDirectIssueFilterWhere(
        makeFilter({ [flag]: value })
      );
      expect(where).toBeNull();
    }
  });

  it("should_handle_materialized_collection_flags_in_direct_path", () => {
    const flags = [
      "onlyNotCollectedNoOwnedVariants",
      "onlyDoubleTrippleCollected",
      "onlyDoubleTripplePublisherCollected",
      "onlyNotOwnedUsMaterial",
    ];
    for (const flag of flags) {
      const where = buildDirectIssueFilterWhere(makeFilter({ [flag]: true }));
      expect(where).not.toBeNull();
    }
  });

  it("should_handle_numbers_filter_in_direct_path", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ numbers: [{ number: "1", compare: ">=" }] })
    );
    expect(where).not.toBeNull();
  });

  it("should_handle_individuals_filter_in_direct_path", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ individuals: [{ name: "Jack Kirby" }] })
    );
    expect(where).not.toBeNull();
  });
});

type WithAnd = { AND?: Array<Record<string, unknown>> } & Record<string, unknown>;

function findSeriesGenresClauses(where: WithAnd | null): Array<Record<string, unknown>> {
  if (where == null) return [];
  const top = Array.isArray(where.AND) ? where.AND : [where];

  const out: Array<Record<string, unknown>> = [];
  for (const clause of top) {
    if (clause == null || typeof clause !== "object") continue;
    const innerAnd = (clause as { AND?: unknown }).AND;
    if (!Array.isArray(innerAnd)) continue;
    for (const inner of innerAnd) {
      if (inner == null || typeof inner !== "object") continue;
      const series = (inner as { series?: { genres?: unknown } }).series;
      if (series && typeof series === "object" && "genres" in series) {
        out.push(inner as Record<string, unknown>);
      }
    }
  }
  return out;
}

describe("buildDirectIssueFilterWhere – genres", () => {
  it("should_no_longer_fall_back_when_genres_filter_is_present", () => {
    const where = buildDirectIssueFilterWhere(makeFilter({ genres: ["Action"] }));
    expect(where).not.toBeNull();
  });

  it("should_emit_series_genres_some_for_each_term_combined_with_AND", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ genres: ["Action", "Drama"] })
    ) as WithAnd;

    const clauses = findSeriesGenresClauses(where);
    expect(clauses).toEqual([
      { series: { genres: { some: { genre: { contains: "Action", mode: "insensitive" } } } } },
      { series: { genres: { some: { genre: { contains: "Drama", mode: "insensitive" } } } } },
    ]);
  });

  it("should_dedupe_and_drop_blank_genre_terms", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ genres: ["Action", "  ", "Action", "Drama"] })
    ) as WithAnd;

    const clauses = findSeriesGenresClauses(where);
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toEqual({
      series: { genres: { some: { genre: { contains: "Action", mode: "insensitive" } } } },
    });
    expect(clauses[1]).toEqual({
      series: { genres: { some: { genre: { contains: "Drama", mode: "insensitive" } } } },
    });
  });

  it("should_not_add_any_genre_clause_when_genres_is_empty", () => {
    const where = buildDirectIssueFilterWhere(makeFilter({ genres: [] })) as WithAnd;
    expect(findSeriesGenresClauses(where)).toEqual([]);
  });
});

describe("selectGroupRepresentatives", () => {
  type Candidate = Parameters<typeof selectGroupRepresentatives>[0][number];

  function candidate(
    id: number,
    fkSeries: number | null,
    number: string,
    format: string
  ): Candidate {
    return {
      id: BigInt(id),
      fkSeries: fkSeries == null ? null : BigInt(fkSeries),
      number,
      format,
    };
  }

  it("should_return_empty_when_no_candidates", () => {
    expect(selectGroupRepresentatives([], new Set())).toEqual([]);
  });

  it("should_pass_through_a_single_unowned_candidate", () => {
    const c = candidate(1, 10, "1", "Heft");
    expect(selectGroupRepresentatives([c], new Set())).toEqual([c]);
  });

  it("should_exclude_a_candidate_whose_group_is_owned", () => {
    const c = candidate(1, 10, "1", "Heft");
    const owned = new Set(["10::1"]);
    expect(selectGroupRepresentatives([c], owned)).toEqual([]);
  });

  it("should_pick_preferred_format_when_two_candidates_share_a_group", () => {
    const heft = candidate(1, 10, "1", "Heft");
    const hardcover = candidate(2, 10, "1", "Hardcover");
    const result = selectGroupRepresentatives([hardcover, heft], new Set());
    expect(result).toEqual([heft]);
  });

  it("should_break_ties_on_id_when_format_ranks_are_equal", () => {
    const a = candidate(2, 10, "1", "Heft");
    const b = candidate(1, 10, "1", "Heft");
    const result = selectGroupRepresentatives([a, b], new Set());
    expect(result).toEqual([b]);
  });

  it("should_return_one_representative_per_group_independently", () => {
    const group1 = candidate(1, 10, "1", "Heft");
    const group2hc = candidate(3, 10, "2", "Hardcover");
    const group2sc = candidate(4, 10, "2", "Softcover");
    const result = selectGroupRepresentatives([group1, group2hc, group2sc], new Set());
    expect(result).toEqual([group1, group2sc]);
  });

  it("should_exclude_owned_groups_independently_of_format_ranks", () => {
    const ownedGroup = candidate(1, 10, "1", "Heft");
    const freeGroup = candidate(2, 10, "2", "Hardcover");
    const result = selectGroupRepresentatives(
      [ownedGroup, freeGroup],
      new Set(["10::1"])
    );
    expect(result).toEqual([freeGroup]);
  });

  it("should_treat_null_fkSeries_as_distinct_x_bucket", () => {
    const unsetSeries = candidate(1, null, "1", "Heft");
    const setSeries = candidate(2, 10, "1", "Heft");
    const result = selectGroupRepresentatives([unsetSeries, setSeries], new Set());
    expect(result).toEqual([unsetSeries, setSeries]);
  });
});

type RawWithAnd = { AND?: Array<Record<string, unknown>> } & Record<string, unknown>;

function topLevelAnd(where: RawWithAnd | null): Array<Record<string, unknown>> {
  if (where == null) return [];
  return Array.isArray(where.AND) ? where.AND : [where];
}

function findClauseWithKey(
  where: RawWithAnd | null,
  key: string
): Record<string, unknown> | undefined {
  return topLevelAnd(where).find((clause) => clause != null && typeof clause === "object" && key in clause);
}

describe("buildDirectIssueFilterWhere – numbers", () => {
  it("should_emit_string_equality_on_number_and_legacyNumber_for_exact_match", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ numbers: [{ number: "1A", compare: "=" }] })
    ) as RawWithAnd;

    const clauses = topLevelAnd(where).filter((c) => "OR" in c);
    expect(clauses).toEqual([{ OR: [{ number: "1A" }, { legacyNumber: "1A" }] }]);
  });

  it("should_use_numeric_columns_for_range_compare_with_numeric_filter_value", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ numbers: [{ number: "10", compare: ">=" }] })
    ) as RawWithAnd;

    const clauses = topLevelAnd(where).filter((c) => "OR" in c);
    expect(clauses).toHaveLength(1);
    const firstOr = clauses[0].OR as Array<Record<string, unknown>>;
    expect(firstOr).toHaveLength(2);
    expect(firstOr[0]).toHaveProperty("numberNumeric");
    expect(firstOr[1]).toHaveProperty("legacyNumberNumeric");
  });

  it("should_use_lexical_columns_for_range_compare_with_non_numeric_filter_value", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ numbers: [{ number: "Annual", compare: ">" }] })
    ) as RawWithAnd;

    const clauses = topLevelAnd(where).filter((c) => "OR" in c);
    expect(clauses).toEqual([
      { OR: [{ number: { gt: "Annual" } }, { legacyNumber: { gt: "Annual" } }] },
    ]);
  });

  it("should_wrap_number_clause_in_AND_with_variant_when_variant_is_set", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ numbers: [{ number: "1", compare: "=", variant: "A" }] })
    ) as RawWithAnd;

    const andClauses = topLevelAnd(where).filter((c) => "AND" in c);
    expect(andClauses).toHaveLength(1);
    const inner = andClauses[0].AND as Array<Record<string, unknown>>;
    expect(inner).toEqual([
      { OR: [{ number: "1" }, { legacyNumber: "1" }] },
      {
        variants: {
          some: {
            variantLabel: "A",
          },
        },
      },
    ]);
  });

  it("should_combine_multiple_number_entries_at_top_AND_level", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({
        numbers: [
          { number: "1", compare: ">=" },
          { number: "10", compare: "<=" },
        ],
      })
    ) as RawWithAnd;

    const numericClauses = topLevelAnd(where).filter((c) => "OR" in c);
    expect(numericClauses).toHaveLength(2);
  });
});

describe("buildDirectIssueFilterWhere – individuals", () => {
  function storiesClause(where: RawWithAnd | null): Record<string, unknown> | undefined {
    return findClauseWithKey(where, "stories");
  }

  it("should_emit_story_or_parent_OR_when_no_types_are_given", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ individuals: [{ name: "Jack Kirby" }] })
    ) as RawWithAnd;

    const clause = storiesClause(where);
    expect(clause).toBeDefined();
    const branches = ((clause!.stories as { some: { OR: unknown[] } }).some.OR) as Array<
      Record<string, unknown>
    >;
    expect(branches).toEqual([
      { individuals: { some: { individual: { name: "Jack Kirby" } } } },
      { parent: { individuals: { some: { individual: { name: "Jack Kirby" } } } } },
    ]);
  });

  it("should_emit_story_level_TRANSLATOR_branch_when_TRANSLATOR_is_among_types", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ individuals: [{ name: "Mike", type: ["TRANSLATOR"] }] })
    ) as RawWithAnd;

    const clause = storiesClause(where);
    const branches = ((clause!.stories as { some: { OR: unknown[] } }).some.OR) as Array<
      Record<string, unknown>
    >;
    expect(branches).toEqual([
      {
        individuals: {
          some: {
            individual: { name: "Mike" },
            type: { equals: "TRANSLATOR", mode: "insensitive" },
          },
        },
      },
    ]);
  });

  it("should_emit_parent_branch_and_self_when_no_parent_branch_for_non_translator_types", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ individuals: [{ name: "Stan", type: ["WRITER", "PENCILER"] }] })
    ) as RawWithAnd;

    const clause = storiesClause(where);
    const branches = ((clause!.stories as { some: { OR: unknown[] } }).some.OR) as Array<
      Record<string, unknown>
    >;
    expect(branches).toHaveLength(2);
    expect(branches[0]).toEqual({
      parent: {
        individuals: {
          some: {
            individual: { name: "Stan" },
            type: { in: ["WRITER", "PENCILER"], mode: "insensitive" },
          },
        },
      },
    });
    expect(branches[1]).toEqual({
      parent: null,
      individuals: {
        some: {
          individual: { name: "Stan" },
          type: { in: ["WRITER", "PENCILER"], mode: "insensitive" },
        },
      },
    });
  });

  it("should_emit_both_TRANSLATOR_and_non_translator_branches_for_mixed_types", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ individuals: [{ name: "Pat", type: ["TRANSLATOR", "WRITER"] }] })
    ) as RawWithAnd;

    const clause = storiesClause(where);
    const branches = ((clause!.stories as { some: { OR: unknown[] } }).some.OR) as Array<
      Record<string, unknown>
    >;
    expect(branches).toHaveLength(3);
  });

  it("should_uppercase_and_dedupe_type_strings_before_use", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ individuals: [{ name: "Stan", type: ["writer", "Writer", "WRITER"] }] })
    ) as RawWithAnd;

    const clause = storiesClause(where);
    const branches = ((clause!.stories as { some: { OR: unknown[] } }).some.OR) as Array<
      Record<string, unknown>
    >;
    const firstBranch = branches[0] as {
      parent: { individuals: { some: { type: { in: string[]; mode: string } } } };
    };
    expect(firstBranch.parent.individuals.some.type.in).toEqual(["WRITER"]);
  });

  it("should_combine_multiple_individual_entries_at_top_AND_level", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({
        individuals: [{ name: "Kirby" }, { name: "Lee" }],
      })
    ) as RawWithAnd;

    const storyClauses = topLevelAnd(where).filter((c) => "stories" in c);
    expect(storyClauses).toHaveLength(2);
  });

  it("should_skip_entries_with_empty_name", () => {
    const where = buildDirectIssueFilterWhere(
      makeFilter({ individuals: [{ name: "" }, { name: "Kirby" }] })
    ) as RawWithAnd;

    const storyClauses = topLevelAnd(where).filter((c) => "stories" in c);
    expect(storyClauses).toHaveLength(1);
  });
});

describe("buildDirectIssueFilterWhere – new custom filter flags", () => {
  it("should emit correct conditions for onlyNeededIssues", () => {
    const where = buildDirectIssueFilterWhere({
      onlyNeededIssues: true,
      us: false,
    }) as any;

    expect(where.AND).toContainEqual({
      noOwnedVariants: true,
      stories: { some: { collected: false } },
      OR: [
        { stories: { some: { firstApp: true, collected: false } } },
        { hasOtherOnlyTb: true },
        { hasExclusiveStory: true },
        {
          variants: {
            some: { format: { equals: "Hardcover", mode: "insensitive" } },
            none: { format: { equals: "Softcover", mode: "insensitive" } },
          },
        },
      ],
    });
  });

  it("should emit correct conditions for onlyUnownedFirstPrints", () => {
    const where = buildDirectIssueFilterWhere({
      onlyUnownedFirstPrints: true,
      us: false,
    }) as any;

    expect(where.AND).toContainEqual({
      noOwnedVariants: true,
      hasFirstPrint: true,
    });
  });

  it("should emit correct conditions for onlyNewUsMaterial", () => {
    const where = buildDirectIssueFilterWhere({
      onlyNewUsMaterial: true,
      us: false,
    }) as any;

    expect(where.AND).toContainEqual({
      noOwnedVariants: false,
      stories: {
        some: {},
        none: {
          OR: [
            { fkParent: null },
            {
              parent: {
                issue: {
                  series: {
                    startYear: { lt: BigInt(2025) },
                  },
                },
              },
            },
          ],
        },
      },
    });
  });

  it("should_not_emit_direct_where_conditions_for_onlyUnownedPublisherFirstPrints", () => {
    // onlyUnownedPublisherFirstPrints is resolved via SQL in resolveCustomFilterToIssueIds,
    // not via buildDirectIssueFilterWhere. The direct filter should still return non-null
    // (i.e. not bail out), but must not contain any has* clause for this flag.
    const where = buildDirectIssueFilterWhere({
      onlyUnownedPublisherFirstPrints: true,
      us: false,
    }) as WhereWithAggregates | null;

    // The function should produce a valid WHERE (not null/empty) so pagination works
    expect(where).not.toBeNull();

    // No hasFirstPrint or similar aggregate clause should be emitted for this flag
    const aggregates = aggregateClauses(where as WhereWithAggregates);
    expect(aggregates).not.toContainEqual(
      expect.objectContaining({ hasFirstPrint: expect.anything() })
    );
  });
});

describe("buildDirectIssueFilterWhere – publisher and series wildcard * contains/AND", () => {
  it("should build AND/contains conditions for publisher name with asterisk", () => {
    const where = buildDirectIssueFilterWhere({
      publishers: [{ name: "*Panini*" }],
      us: false,
    }) as any;

    expect(where.AND).toContainEqual({
      AND: [
        {
          series: {
            publisher: {
              name: {
                contains: "Panini",
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  });

  it("should build AND/contains conditions for series title with asterisk", () => {
    const where = buildDirectIssueFilterWhere({
      series: [{ title: "Spider-Man*Avengers", volume: 1 }],
      us: false,
    }) as any;

    expect(where.AND).toContainEqual({
      AND: [
        {
          series: {
            title: {
              contains: "Spider-Man",
              mode: "insensitive",
            },
          },
        },
        {
          series: {
            title: {
              contains: "Avengers",
              mode: "insensitive",
            },
          },
        },
        {
          series: {
            volume: 1n,
          },
        },
      ],
    });
  });
});

