import {
  parseQueryString,
  tokensToFilterValues,
  filterValuesToQueryString,
  tokenToChipLabel,
  queryStringToFilterValues as originalQueryStringToFilterValues,
  flattenFilterToChips,
  SerializedFilter,
  flattenASTToFlatFilterValues,
} from "./filter-query-syntax";

function createDefaultFilterValues() {
  return {
    formats: [],
    withVariants: false,
    releasedateFrom: "",
    releasedateTo: "",
    releasedateExact: "",
    publishers: [],
    series: [],
    genres: [],
    numberFrom: "",
    numberTo: "",
    numberExact: "",
    numberVariant: "",
    arcs: [],
    individuals: [],
    appearances: [],
    realities: [],
    firstPrint: false,
    notFirstPrint: false,
    onlyPrint: false,
    notOnlyPrint: false,
    onlyTb: false,
    notOnlyTb: false,
    exclusive: false,
    notExclusive: false,
    reprint: false,
    notReprint: false,
    otherOnlyTb: false,
    notOtherOnlyTb: false,
    onlyOnePrint: false,
    notOnlyOnePrint: false,
    noPrint: false,
    notNoPrint: false,
    onlyCollected: false,
    onlyNotCollected: false,
    onlyNotCollectedNoOwnedVariants: false,
    noComicguideId: false,
    noContent: false,
    onlyDoubleTrippleCollected: false,
    onlyDoubleTripplePublisherCollected: false,
    onlyNotOwnedUsMaterial: false,
    onlyIssuesWithMultipleCollectedVariants: false,
    onlyNeededIssues: false,
    onlyIncompleteSeries: false,
    onlyUnownedFirstPrints: false,
    onlyUnownedPublisherFirstPrints: false,
    onlyNewUsMaterial: false,
    onlySellingList: false,
    onlyFirstOfMonthRelease: false,
    crossPublishers: [],
    crossSeries: [],
    crossNumber: "",
    crossVolume: "",
    crossStartYear: "",
    crossEndYear: "",
    contentFilterMode: "and",
    crossExclusive: false,
  } as any;
}

function queryStringToFilterValues(raw: string) {
  return originalQueryStringToFilterValues(raw, createDefaultFilterValues());
}

describe("parseQueryString", () => {
  it("should_parse_single_verlag_token", () => {
    const { tokens, freetext } = parseQueryString("v:Panini");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("verlag");
    expect(tokens[0].value).toBe("Panini");
    expect(freetext).toBe("");
  });

  it("should_accept_all_publisher_aliases", () => {
    const aliases = ["v:Panini", "verlag:Panini", "pub:Panini", "publisher:Panini", "p:Panini"];
    for (const raw of aliases) {
      const { tokens } = parseQueryString(raw);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].kind).toBe("verlag");
      expect(tokens[0].value).toBe("Panini");
    }
  });

  it("should_parse_date_with_compare_operator", () => {
    const { tokens } = parseQueryString("d:>=2024-01-01");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("datum");
    expect(tokens[0].compare).toBe(">=");
    expect(tokens[0].value).toBe("2024-01-01");
  });

  it("should_parse_quoted_value_with_spaces", () => {
    const { tokens } = parseQueryString('s:"Spider-Man: Blue"');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("serie");
    expect(tokens[0].value).toBe("Spider-Man: Blue");
  });

  it("should_keep_freetext_separate", () => {
    const { tokens, freetext } = parseQueryString("v:Panini spider-man");
    expect(tokens).toHaveLength(1);
    expect(freetext).toBe("spider-man");
  });
});

describe("queryStringToFilterValues (AST Parsing)", () => {
  it("should_merge_flat_AND_fields_into_single_flat_object", () => {
    const { values } = queryStringToFilterValues("v:Panini f:Heft");
    expect("operator" in values).toBe(false); // Optimized to flat leaf
    const flat = values as any;
    expect(flat.publishers[0].name).toBe("Panini");
    expect(flat.formats[0].name).toBe("Heft");
  });

  it("should_create_OR_node_for_explicit_disjunction", () => {
    const { values } = queryStringToFilterValues("v:Panini OR v:Marvel");
    expect("operator" in values).toBe(true);
    const tree = values as any;
    expect(tree.operator).toBe("or");
    expect(tree.operands).toHaveLength(2);
    expect(tree.operands[0].publishers[0].name).toBe("Panini");
    expect(tree.operands[1].publishers[0].name).toBe("Marvel");
  });

  it("should_parse_parenthesised_expression", () => {
    const { values } = queryStringToFilterValues("(v:Panini f:Heft) OR v:Marvel");
    expect("operator" in values).toBe(true);
    const tree = values as any;
    expect(tree.operator).toBe("or");
    expect(tree.operands).toHaveLength(2);

    // Left operand: (v:Panini f:Heft) -> merged flat AND node
    expect("operator" in tree.operands[0]).toBe(false);
    expect(tree.operands[0].publishers[0].name).toBe("Panini");
    expect(tree.operands[0].formats[0].name).toBe("Heft");

    // Right operand: v:Marvel
    expect(tree.operands[1].publishers[0].name).toBe("Marvel");
  });
});

describe("filterValuesToQueryString (AST Serialization)", () => {
  it("should_serialize_flat_filter_values", () => {
    const base = createDefaultFilterValues();
    base.publishers = [{ name: "Panini" }];
    base.formats = [{ name: "Heft" }];
    const result = filterValuesToQueryString(base);
    expect(result).toBe("v:Panini f:Heft");
  });

  it("should_serialize_nested_logical_OR", () => {
    const left = createDefaultFilterValues();
    left.publishers = [{ name: "Panini" }];
    const right = createDefaultFilterValues();
    right.publishers = [{ name: "Marvel" }];

    const tree: SerializedFilter = {
      operator: "or",
      operands: [left, right],
    };

    const result = filterValuesToQueryString(tree);
    expect(result).toBe("v:Panini OR v:Marvel");
  });

  it("should_serialize_nested_AND_OR_with_correct_parentheses", () => {
    const p1 = createDefaultFilterValues();
    p1.publishers = [{ name: "Panini" }];
    const f1 = createDefaultFilterValues();
    f1.formats = [{ name: "Heft" }];
    const f2 = createDefaultFilterValues();
    f2.formats = [{ name: "Hardcover" }];

    // v:Panini AND (f:Heft OR f:Hardcover)
    const orNode: SerializedFilter = {
      operator: "or",
      operands: [f1, f2],
    };
    const tree: SerializedFilter = {
      operator: "and",
      operands: [p1, orNode],
    };

    const result = filterValuesToQueryString(tree);
    expect(result).toBe("v:Panini (f:Heft OR f:Hardcover)");
  });
});

describe("flattenFilterToChips", () => {
  it("should_flatten_flat_filter_to_standard_chips", () => {
    const base = createDefaultFilterValues();
    base.publishers = [{ name: "Panini" }];
    const chips = flattenFilterToChips(base);
    expect(chips).toHaveLength(1);
    expect(chips[0].type).toBe("filter");
    expect(chips[0].value).toBe("Verlag: Panini");
    expect(chips[0].raw).toBe("v:Panini");
  });

  it("should_flatten_nested_filter_including_operators_and_parentheses", () => {
    const p1 = createDefaultFilterValues();
    p1.publishers = [{ name: "Panini" }];
    const f1 = createDefaultFilterValues();
    f1.formats = [{ name: "Heft" }];
    const f2 = createDefaultFilterValues();
    f2.formats = [{ name: "Hardcover" }];

    // v:Panini AND (f:Heft OR f:Hardcover)
    const orNode: SerializedFilter = {
      operator: "or",
      operands: [f1, f2],
    };
    const tree: SerializedFilter = {
      operator: "and",
      operands: [p1, orNode],
    };

    const chips = flattenFilterToChips(tree);
    
    // Expected order:
    // 0: v:Panini
    // 1: (
    // 2: f:Heft
    // 3: OR
    // 4: f:Hardcover
    // 5: )
    expect(chips).toHaveLength(6);
    expect(chips[0]).toEqual({ type: "filter", value: "Verlag: Panini", raw: "v:Panini" });
    expect(chips[1]).toEqual({ type: "parenthesis", value: "(", raw: "(" });
    expect(chips[2]).toEqual({ type: "filter", value: "Format: Heft", raw: "f:Heft" });
    expect(chips[3]).toEqual({ type: "operator", value: "OR", raw: "OR" });
    expect(chips[4]).toEqual({ type: "filter", value: "Format: Hardcover", raw: "f:Hardcover" });
    expect(chips[5]).toEqual({ type: "parenthesis", value: ")", raw: ")" });
  });
});

describe("flattenASTToFlatFilterValues", () => {
  it("should_flatten_nested_AST_into_single_flat_object", () => {
    const p1 = createDefaultFilterValues();
    p1.publishers = [{ name: "Panini" }];
    const f1 = createDefaultFilterValues();
    f1.formats = [{ name: "Heft" }];
    const f2 = createDefaultFilterValues();
    f2.formats = [{ name: "Hardcover" }];

    const orNode: SerializedFilter = {
      operator: "or",
      operands: [f1, f2],
    };
    const tree: SerializedFilter = {
      operator: "and",
      operands: [p1, orNode],
    };

    const flat = flattenASTToFlatFilterValues(tree, createDefaultFilterValues());
    expect(flat.publishers).toHaveLength(1);
    expect(flat.publishers[0].name).toBe("Panini");
    expect(flat.formats).toHaveLength(2);
    expect(flat.formats[0].name).toBe("Heft");
    expect(flat.formats[1].name).toBe("Hardcover");
  });
});

