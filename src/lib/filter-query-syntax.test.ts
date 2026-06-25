import {
  parseQueryString,
  tokensToFilterValues,
  filterValuesToQueryString,
  tokenToChipLabel,
  queryStringToFilterValues as originalQueryStringToFilterValues,
  flattenFilterToChips,
  SerializedFilter,
  flattenASTToFlatFilterValues,
  flatFilterValuesToAST,
  validateQuery,
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
    excludeOnlyNewUsMaterial: false,
    onlySellingList: false,
    onlyFirstOfMonthRelease: false,
    crossPublishers: [],
    crossSeries: [],
    crossNumber: "",
    crossVolume: "",
    crossStartYear: "",
    crossEndYear: "",
    contentFilterMode: "or",
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
    expect(result).toBe("v:Panini AND f:Heft");
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
    expect(result).toBe("(v:Panini OR v:Marvel)");
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
    expect(result).toBe("v:Panini AND (f:Heft OR f:Hardcover)");
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
    expect(chips).toHaveLength(7);
    expect(chips[0]).toEqual({ type: "filter", value: "Verlag: Panini", raw: "v:Panini" });
    expect(chips[1]).toEqual({ type: "operator", value: "AND", raw: "AND" });
    expect(chips[2]).toEqual({ type: "parenthesis", value: "(", raw: "(" });
    expect(chips[3]).toEqual({ type: "filter", value: "Format: Heft", raw: "f:Heft" });
    expect(chips[4]).toEqual({ type: "operator", value: "OR", raw: "OR" });
    expect(chips[5]).toEqual({ type: "filter", value: "Format: Hardcover", raw: "f:Hardcover" });
    expect(chips[6]).toEqual({ type: "parenthesis", value: ")", raw: ")" });
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

describe("Query syntax flags (onlyPrint, notOnlyPrint, etc.)", () => {
  it("should_parse_and_serialize_new_flags", () => {
    const { values: parsed } = queryStringToFilterValues("mehrfach-erschienen");
    expect((parsed as any).notOnlyPrint).toBe(true);

    const base = createDefaultFilterValues();
    base.notOnlyPrint = true;
    const serialized = filterValuesToQueryString(base);
    expect(serialized).toBe("mehrfach-erschienen");

    const chips = flattenFilterToChips(base);
    expect(chips).toHaveLength(1);
    expect(chips[0]).toEqual({
      type: "filter",
      value: "Mehrere Veröffentlichungen",
      raw: "mehrfach-erschienen",
    });
  });

  it("should_parse_and_serialize_other_only_tb", () => {
    const { values: parsed } = queryStringToFilterValues("sonst-nur-tb");
    expect((parsed as any).otherOnlyTb).toBe(true);

    const base = createDefaultFilterValues();
    base.otherOnlyTb = true;
    const serialized = filterValuesToQueryString(base);
    expect(serialized).toBe("sonst-nur-tb");
  });
});

describe("flatFilterValuesToAST and nested chip flattening", () => {
  it("should_convert_flat_filter_with_multiple_publishers_to_AST", () => {
    const base = createDefaultFilterValues();
    base.publishers = [{ name: "condor" }, { name: "Panini" }];

    const ast = flatFilterValuesToAST(base);
    expect(ast).toHaveProperty("operator", "or");
    const operands = (ast as any).operands;
    expect(operands).toHaveLength(2);
    expect(operands[0].publishers[0].name).toBe("condor");
    expect(operands[1].publishers[0].name).toBe("Panini");
  });

  it("should_convert_flat_filter_with_multiple_publishers_and_series_to_AST", () => {
    const base = createDefaultFilterValues();
    base.publishers = [{ name: "condor" }, { name: "Panini" }];
    base.series = [{ title: "Spider-Man" }];

    const ast = flatFilterValuesToAST(base);
    expect(ast).toHaveProperty("operator", "and");
    const operands = (ast as any).operands;
    expect(operands).toHaveLength(2);
    
    // First operand is the OR of publishers
    expect(operands[0]).toHaveProperty("operator", "or");
    expect(operands[0].operands[0].publishers[0].name).toBe("condor");
    expect(operands[0].operands[1].publishers[0].name).toBe("Panini");

    // Second operand is the series
    expect(operands[1].series[0].title).toBe("Spider-Man");
  });

  it("should_flatten_flat_filter_with_multiple_publishers_to_parenthesized_chips", () => {
    const base = createDefaultFilterValues();
    base.publishers = [{ name: "condor" }, { name: "Panini" }];

    const chips = flattenFilterToChips(base);
    expect(chips).toHaveLength(5);
    expect(chips[0]).toEqual({ type: "parenthesis", value: "(", raw: "(" });
    expect(chips[1]).toEqual({ type: "filter", value: "Verlag: condor", raw: "v:condor" });
    expect(chips[2]).toEqual({ type: "operator", value: "OR", raw: "OR" });
    expect(chips[3]).toEqual({ type: "filter", value: "Verlag: Panini", raw: "v:Panini" });
    expect(chips[4]).toEqual({ type: "parenthesis", value: ")", raw: ")" });
  });

  it("should_preserve_mixed_AND_and_OR_logical_chains_without_rewriting_AND_to_OR", () => {
    const { values } = queryStringToFilterValues('(v:"Panini - Marvel & Icon" OR v:Condor AND v:BSV)');
    expect("operator" in values).toBe(true);
    const ast = values as any;
    expect(ast.operator).toBe("or");
    expect(ast.operands).toHaveLength(2);
    expect(ast.operands[0].publishers[0].name).toBe("Panini - Marvel & Icon");
    expect(ast.operands[1].operator).toBe("and");
    expect(ast.operands[1].operands).toHaveLength(2);
    expect(ast.operands[1].operands[0].publishers[0].name).toBe("Condor");
    expect(ast.operands[1].operands[1].publishers[0].name).toBe("BSV");

    const chips = flattenFilterToChips(ast);
    expect(chips).toHaveLength(7);
    expect(chips[0]).toEqual({ type: "parenthesis", value: "(", raw: "(" });
    expect(chips[1]).toEqual({ type: "filter", value: "Verlag: Panini - Marvel & Icon", raw: 'v:"Panini - Marvel & Icon"' });
    expect(chips[2]).toEqual({ type: "operator", value: "OR", raw: "OR" });
    expect(chips[3]).toEqual({ type: "filter", value: "Verlag: Condor", raw: "v:Condor" });
    expect(chips[4]).toEqual({ type: "operator", value: "AND", raw: "AND" });
    expect(chips[5]).toEqual({ type: "filter", value: "Verlag: BSV", raw: "v:BSV" });
    expect(chips[6]).toEqual({ type: "parenthesis", value: ")", raw: ")" });
  });

  it("should_flatten_nested_filter_with_flat_operands_having_multiple_keys_without_recursion_error", () => {
    const ast: SerializedFilter = {
      operator: "or",
      operands: [
        {
          publishers: [{ name: "Panini - Marvel & Icon" }],
        } as any,
        {
          publishers: [{ name: "Condor" }],
          series: [{ title: "Action Force", volume: 1 }],
        } as any,
      ],
    };

    const chips = flattenFilterToChips(ast);
    expect(chips).toHaveLength(7);
    expect(chips[0]).toEqual({ type: "parenthesis", value: "(", raw: "(" });
    expect(chips[1]).toEqual({ type: "filter", value: "Verlag: Panini - Marvel & Icon", raw: 'v:"Panini - Marvel & Icon"' });
    expect(chips[2]).toEqual({ type: "operator", value: "OR", raw: "OR" });
    expect(chips[3]).toEqual({ type: "filter", value: "Verlag: Condor", raw: "v:Condor" });
    expect(chips[4]).toEqual({ type: "operator", value: "AND", raw: "AND" });
    expect(chips[5]).toEqual({ type: "filter", value: "Serie: Action Force", raw: 's:"Action Force"' });
    expect(chips[6]).toEqual({ type: "parenthesis", value: ")", raw: ")" });
  });
});

describe("validateQuery", () => {
  it("should_return_valid_for_empty_query", () => {
    const res = validateQuery("");
    expect(res.valid).toBe(true);
    expect(res.error).toBeNull();
  });

  it("should_return_valid_for_standard_query", () => {
    const res = validateQuery("v:Panini AND f:Heft");
    expect(res.valid).toBe(true);
    expect(res.error).toBeNull();
  });

  it("should_return_invalid_for_mismatched_parentheses", () => {
    const res1 = validateQuery("(v:Panini");
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain("Nicht geschlossene Klammer");

    const res2 = validateQuery("v:Panini)");
    expect(res2.valid).toBe(false);
    expect(res2.error).toContain("Schließende Klammer ohne passende");
  });

  it("should_return_invalid_for_empty_filter_values", () => {
    const res = validateQuery("v:Panini AND f:");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Unvollständiger Filter");
  });

  it("should_return_invalid_for_dangling_or_consecutive_operators", () => {
    const res1 = validateQuery("AND v:Panini");
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain("Ungültige Operator-Reihenfolge");

    const res2 = validateQuery("v:Panini OR");
    expect(res2.valid).toBe(false);
    expect(res2.error).toContain("Filter darf nicht mit einem Operator enden");

    const res3 = validateQuery("v:Panini AND OR f:Heft");
    expect(res3.valid).toBe(false);
    expect(res3.error).toContain("Ungültige Operator-Reihenfolge");

    const res4 = validateQuery("(OR v:Panini)");
    expect(res4.valid).toBe(false);
    expect(res4.error).toContain("Klammer darf nicht mit Operator");
  });
});

describe("Extended Expert Mode capabilities", () => {
  it("should parse specific contributor roles and merge them correctly", () => {
    const { values: parsed } = queryStringToFilterValues("w:Lee AND pe:Kirby AND translator:Szatmary");
    const flat = flattenASTToFlatFilterValues(parsed, createDefaultFilterValues());
    
    expect(flat.individuals).toEqual(
      expect.arrayContaining([
        { name: "Lee", role: ["WRITER"], type: ["WRITER"] },
        { name: "Kirby", role: ["PENCILER"], type: ["PENCILER"] },
        { name: "Szatmary", role: ["TRANSLATOR"], type: ["TRANSLATOR"] }
      ])
    );
  });

  it("should merge roles if the same individual is specified with different roles", () => {
    const { values: parsed } = queryStringToFilterValues("w:Kirby AND pe:Kirby");
    const flat = flattenASTToFlatFilterValues(parsed, createDefaultFilterValues());
    expect(flat.individuals).toHaveLength(1);
    expect(flat.individuals[0].name).toBe("Kirby");
    expect(flat.individuals[0].role).toEqual(["WRITER", "PENCILER"]);
  });

  it("should parse cross-scope attributes", () => {
    const { values: parsed } = queryStringToFilterValues("xv:Marvel AND xs:Avengers AND xn:5 AND xvol:1 AND xyear:1963 AND xexklusiv");
    const flat = flattenASTToFlatFilterValues(parsed, createDefaultFilterValues());
    expect(flat).toEqual(
      expect.objectContaining({
        crossPublishers: [{ name: "Marvel" }],
        crossSeries: [{ title: "Avengers", volume: 1 }],
        crossNumber: "5",
        crossVolume: "1",
        crossStartYear: "1963",
        crossExclusive: true
      })
    );
  });

  it("should parse new collection/selling/admin flags", () => {
    const { values: parsed } = queryStringToFilterValues("mit-varianten AND benötigt AND mehrfach-gesammelt AND ungesammeltes-us-material AND kein-us-material-neu");
    const flat = flattenASTToFlatFilterValues(parsed, createDefaultFilterValues());
    expect(flat).toEqual(
      expect.objectContaining({
        withVariants: true,
        onlyNeededIssues: true,
        onlyIssuesWithMultipleCollectedVariants: true,
        onlyNotOwnedUsMaterial: true,
        excludeOnlyNewUsMaterial: true,
      })
    );
  });

  it("should preserve asterisk wildcards in series and publishers values", () => {
    const { values: parsed } = queryStringToFilterValues("s:Spidey*Avengers AND v:Panini*Marvel");
    const flat = flattenASTToFlatFilterValues(parsed, createDefaultFilterValues());
    expect(flat.series[0].title).toBe("Spidey*Avengers");
    expect(flat.publishers[0].name).toBe("Panini*Marvel");
  });

  it("should serialize extended filters back to a query string representation", () => {
    const defaultVals = createDefaultFilterValues();
    const testVals = {
      ...defaultVals,
      withVariants: true,
      onlyNeededIssues: true,
      onlyNotOwnedUsMaterial: true,
      excludeOnlyNewUsMaterial: true,
      crossNumber: "10",
      crossExclusive: true,
      crossPublishers: [{ name: "Condor" }],
      individuals: [
        { name: "Stan Lee", role: ["WRITER", "EDITOR"], type: ["WRITER", "EDITOR"] }
      ]
    };

    const qs = filterValuesToQueryString(testVals);
    expect(qs).toContain("mit-varianten");
    expect(qs).toContain("benötigt");
    expect(qs).toContain("ungesammeltes-us-material");
    expect(qs).toContain("kein-us-material-neu");
    expect(qs).toContain("xn:10");
    expect(qs).toContain("xexklusiv");
    expect(qs).toContain("xv:Condor");
    expect(qs).toContain("w:\"Stan Lee\"");
    expect(qs).toContain("ed:\"Stan Lee\"");
  });
});

