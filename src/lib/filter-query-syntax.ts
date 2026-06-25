/**
 * filter-query-syntax.ts
 *
 * Scryfall-style query-string parser for Shortbox filters.
 * Supports logical AND, OR, and parenthesis nesting.
 *
 * Supports German, English and abbreviated keywords (e.g. `v:`, `p:`, `verlag:`, `publisher:`).
 * Pure module – no Prisma, no network, no Next.js imports.
 */

import type { FilterValues } from "../types/filter";
import type { FieldItem } from "../util/filterFieldHelpers";

// ---------------------------------------------------------------------------
// Token & AST types
// ---------------------------------------------------------------------------

export type TokenKind =
  | "verlag"
  | "serie"
  | "format"
  | "genre"
  | "datum"
  | "nummer"
  | "arc"
  | "creator"
  | "auftritt"
  | "realitaet"
  | "flag"
  | "freetext"
  | "writer"
  | "penciler"
  | "inker"
  | "colorist"
  | "letterer"
  | "editor"
  | "translator"
  | "crossPublishers"
  | "crossSeries"
  | "crossNumber"
  | "crossVolume"
  | "crossStartYear"
  | "crossEndYear";

export type CompareOp = ">=" | "<=" | ">" | "<" | "=";

export interface ParsedQueryToken {
  kind: TokenKind;
  value: string;
  compare?: CompareOp;
  raw: string;
}

export type SerializedFilter =
  | { operator: "and" | "or"; operands: SerializedFilter[] }
  | FilterValues;

export interface RenderChipToken {
  type: "parenthesis" | "operator" | "filter";
  value: string; // Display label (e.g., "(", ")", "OR", or "Verlag: Panini")
  raw: string;   // Serialized token string (e.g., "v:Panini")
}

// ---------------------------------------------------------------------------
// Keyword maps (all lowercase)
// ---------------------------------------------------------------------------

const KIND_ALIASES: Record<string, TokenKind> = {
  // verlag / publisher
  p: "verlag",
  v: "verlag",
  pub: "verlag",
  verlag: "verlag",
  publisher: "verlag",
  // serie / series
  s: "serie",
  serie: "serie",
  series: "serie",
  // format
  f: "format",
  format: "format",
  // genre
  g: "genre",
  genre: "genre",
  // datum / date
  d: "datum",
  datum: "datum",
  date: "datum",
  j: "datum",
  jahr: "datum",
  year: "datum",
  // nummer / number
  n: "nummer",
  nr: "nummer",
  num: "nummer",
  number: "nummer",
  nummer: "nummer",
  // arc
  a: "arc",
  arc: "arc",
  // creator / person / mitwirkende
  cr: "creator",
  person: "creator",
  creator: "creator",
  mitwirkende: "creator",
  // specific contributor roles
  w: "writer",
  writer: "writer",
  autor: "writer",
  author: "writer",
  pe: "penciler",
  penciler: "penciler",
  penciller: "penciler",
  zeichner: "penciler",
  i: "inker",
  inker: "inker",
  co: "colorist",
  colorist: "colorist",
  kolorist: "colorist",
  le: "letterer",
  letterer: "letterer",
  ed: "editor",
  editor: "editor",
  t: "translator",
  translator: "translator",
  uebersetzer: "translator",
  "übersetzer": "translator",
  // auftritt / appearance
  ap: "auftritt",
  auftritt: "auftritt",
  appearance: "auftritt",
  // realitaet / reality
  r: "realitaet",
  realitaet: "realitaet",
  "realität": "realitaet",
  reality: "realitaet",
  // cross-scope
  xv: "crossPublishers",
  xverlag: "crossPublishers",
  xp: "crossPublishers",
  xpublisher: "crossPublishers",
  crosspublisher: "crossPublishers",
  crossverlag: "crossPublishers",
  xs: "crossSeries",
  xserie: "crossSeries",
  xseries: "crossSeries",
  crossseries: "crossSeries",
  crossserie: "crossSeries",
  xn: "crossNumber",
  xnummer: "crossNumber",
  xnumber: "crossNumber",
  crossnumber: "crossNumber",
  crossnummer: "crossNumber",
  xvol: "crossVolume",
  xvolume: "crossVolume",
  crossvolume: "crossVolume",
  xstart: "crossStartYear",
  xstartyear: "crossStartYear",
  crossstartyear: "crossStartYear",
  xyear: "crossStartYear",
  xend: "crossEndYear",
  xendyear: "crossEndYear",
  crossendyear: "crossEndYear",
};

type FlagTarget = { field: keyof FilterValues; value: boolean };

const FLAG_MAP: Record<string, FlagTarget[]> = {
  erstdruck: [{ field: "firstPrint", value: true }],
  "kein-erstdruck": [{ field: "notFirstPrint", value: true }],
  nachdruck: [{ field: "reprint", value: true }],
  "kein-nachdruck": [{ field: "notReprint", value: true }],
  exklusiv: [{ field: "exclusive", value: true }],
  "kein-exklusiv": [{ field: "notExclusive", value: true }],
  gesammelt: [{ field: "onlyCollected", value: true }],
  "nicht-gesammelt": [{ field: "onlyNotCollected", value: true }],
  "nur-taschenbuch": [{ field: "onlyTb", value: true }],
  "kein-taschenbuch": [{ field: "notOnlyTb", value: true }],
  firstprint: [{ field: "firstPrint", value: true }],
  "no-firstprint": [{ field: "notFirstPrint", value: true }],
  reprint: [{ field: "reprint", value: true }],
  "no-reprint": [{ field: "notReprint", value: true }],
  exclusive: [{ field: "exclusive", value: true }],
  "no-exclusive": [{ field: "notExclusive", value: true }],
  collected: [{ field: "onlyCollected", value: true }],
  "not-collected": [{ field: "onlyNotCollected", value: true }],
  "tb-only": [{ field: "onlyTb", value: true }],
  "no-tb": [{ field: "notOnlyTb", value: true }],
  "einzeln-erschienen": [{ field: "onlyPrint", value: true }],
  "only-print": [{ field: "onlyPrint", value: true }],
  "mehrfach-erschienen": [{ field: "notOnlyPrint", value: true }],
  "not-only-print": [{ field: "notOnlyPrint", value: true }],
  "sonst-nur-tb": [{ field: "otherOnlyTb", value: true }],
  "other-only-tb": [{ field: "otherOnlyTb", value: true }],
  "nicht-sonst-nur-tb": [{ field: "notOtherOnlyTb", value: true }],
  "not-other-only-tb": [{ field: "notOtherOnlyTb", value: true }],
  "nur-einmal-deutsch": [{ field: "onlyOnePrint", value: true }],
  "only-one-print": [{ field: "onlyOnePrint", value: true }],
  "nicht-nur-einmal-deutsch": [{ field: "notOnlyOnePrint", value: true }],
  "not-only-one-print": [{ field: "notOnlyOnePrint", value: true }],
  "nicht-deutsch": [{ field: "noPrint", value: true }],
  "no-print": [{ field: "noPrint", value: true }],
  "auch-deutsch": [{ field: "notNoPrint", value: true }],
  "not-no-print": [{ field: "notNoPrint", value: true }],
  "mehrfach-gesammelt": [{ field: "onlyIssuesWithMultipleCollectedVariants", value: true }],
  "multiple-collected": [{ field: "onlyIssuesWithMultipleCollectedVariants", value: true }],
  "benötigt": [{ field: "onlyNeededIssues", value: true }],
  "benoetigt": [{ field: "onlyNeededIssues", value: true }],
  needed: [{ field: "onlyNeededIssues", value: true }],
  "unvollständige-serien": [{ field: "onlyIncompleteSeries", value: true }],
  "unvollstaendige-serien": [{ field: "onlyIncompleteSeries", value: true }],
  "incomplete-series": [{ field: "onlyIncompleteSeries", value: true }],
  "fehlende-erstausgaben": [{ field: "onlyUnownedFirstPrints", value: true }],
  "unowned-firstprints": [{ field: "onlyUnownedFirstPrints", value: true }],
  "fehlende-verlagserstausgaben": [{ field: "onlyUnownedPublisherFirstPrints", value: true }],
  "unowned-publisher-firstprints": [{ field: "onlyUnownedPublisherFirstPrints", value: true }],
  "mehrfach-vorhanden": [{ field: "onlyDoubleTrippleCollected", value: true }],
  "double-collected": [{ field: "onlyDoubleTrippleCollected", value: true }],
  "mehrfach-vorhanden-verlag": [{ field: "onlyDoubleTripplePublisherCollected", value: true }],
  "double-publisher-collected": [{ field: "onlyDoubleTripplePublisherCollected", value: true }],
  "us-material-neu": [{ field: "onlyNewUsMaterial", value: true }],
  "new-us-material": [{ field: "onlyNewUsMaterial", value: true }],
  verkaufsliste: [{ field: "onlySellingList", value: true }],
  "selling-list": [{ field: "onlySellingList", value: true }],
  "ohne-comicguide": [{ field: "noComicguideId", value: true }],
  "no-comicguide": [{ field: "noComicguideId", value: true }],
  "ohne-stories": [{ field: "noContent", value: true }],
  "ohne-inhalt": [{ field: "noContent", value: true }],
  "no-content": [{ field: "noContent", value: true }],
  "erstes-des-monats": [{ field: "onlyFirstOfMonthRelease", value: true }],
  "first-of-month": [{ field: "onlyFirstOfMonthRelease", value: true }],
  "mit-varianten": [{ field: "withVariants", value: true }],
  "with-variants": [{ field: "withVariants", value: true }],
  "nicht-gesammelt-ohne-varianten": [{ field: "onlyNotCollectedNoOwnedVariants", value: true }],
  "not-collected-no-owned-variants": [{ field: "onlyNotCollectedNoOwnedVariants", value: true }],
  "ungesammeltes-us-material": [{ field: "onlyNotOwnedUsMaterial", value: true }],
  "us-material-ungesammelt": [{ field: "onlyNotOwnedUsMaterial", value: true }],
  "uncollected-us-material": [{ field: "onlyNotOwnedUsMaterial", value: true }],
  "inhalt-und": [{ field: "contentFilterMode", value: "and" as any }],
  "content-and": [{ field: "contentFilterMode", value: "and" as any }],
  "inhalt-oder": [{ field: "contentFilterMode", value: "or" as any }],
  "content-or": [{ field: "contentFilterMode", value: "or" as any }],
  "xexklusiv": [{ field: "crossExclusive", value: true }],
  "xexclusive": [{ field: "crossExclusive", value: true }],
  "cross-exclusive": [{ field: "crossExclusive", value: true }],
};

// ---------------------------------------------------------------------------
// Lexer / Tokenizer
// ---------------------------------------------------------------------------

type LexToken =
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "OR" }
  | { type: "AND" }
  | { type: "FILTER"; token: ParsedQueryToken }
  | { type: "FREETEXT"; value: string };

function tokenize(query: string): LexToken[] {
  const tokens: LexToken[] = [];
  let i = 0;

  while (i < query.length) {
    const char = query[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "LPAREN" });
      i++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
      continue;
    }

    const start = i;

    // Check if it is a filter key:compareValue token
    const keyMatch = query.slice(i).match(/^([a-zA-Z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df-]+):([><=]{0,2})/);
    if (keyMatch) {
      const key = keyMatch[1];
      const compare = (keyMatch[2] || "=") as CompareOp;
      i += keyMatch[0].length;

      let value = "";
      if (query[i] === '"' || query[i] === "'") {
        const quote = query[i];
        i++; // open quote
        const valStart = i;
        while (i < query.length && query[i] !== quote) {
          i++;
        }
        value = query.slice(valStart, i);
        if (i < query.length) i++; // close quote
      } else {
        const valStart = i;
        while (i < query.length && !/\s|\(|\)/.test(query[i])) {
          i++;
        }
        value = query.slice(valStart, i);
      }

      const raw = query.slice(start, i);
      const kind = KIND_ALIASES[key.toLowerCase()];
      if (kind) {
        tokens.push({
          type: "FILTER",
          token: { kind, value, compare, raw }
        });
      } else {
        tokens.push({ type: "FREETEXT", value: raw });
      }
      continue;
    }

    // Bare word / flag / operator
    let word = "";
    if (query[i] === '"' || query[i] === "'") {
      const quote = query[i];
      i++;
      const valStart = i;
      while (i < query.length && query[i] !== quote) {
        i++;
      }
      word = query.slice(valStart, i);
      if (i < query.length) i++;
    } else {
      const valStart = i;
      while (i < query.length && !/\s|\(|\)/.test(query[i])) {
        i++;
      }
      word = query.slice(valStart, i);
    }

    const raw = query.slice(start, i);
    const upperWord = word.toUpperCase();

    if (upperWord === "OR") {
      tokens.push({ type: "OR" });
    } else if (upperWord === "AND") {
      tokens.push({ type: "AND" });
    } else {
      const flagTargets = FLAG_MAP[word.toLowerCase()];
      if (flagTargets) {
        tokens.push({
          type: "FILTER",
          token: { kind: "flag", value: word.toLowerCase(), raw }
        });
      } else {
        tokens.push({ type: "FREETEXT", value: word });
      }
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// AST Parser
// ---------------------------------------------------------------------------

function hasOverlap(a: FilterValues, b: FilterValues): boolean {
  const isActive = (val: any): boolean => {
    if (val === undefined || val === null) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "boolean") return val === true;
    if (typeof val === "string") return val !== "";
    return true;
  };

  for (const key of Object.keys(a) as Array<keyof FilterValues>) {
    if (key === "contentFilterMode") continue;
    if (isActive(a[key]) && isActive(b[key])) {
      return true;
    }
  }
  return false;
}

function combineNodes(
  operator: "and" | "or",
  left: SerializedFilter,
  right: SerializedFilter
): SerializedFilter {
  const leftIsFlat = !("operator" in left);
  const rightIsFlat = !("operator" in right);

  if (
    operator === "and" &&
    leftIsFlat &&
    rightIsFlat &&
    !hasOverlap(left as FilterValues, right as FilterValues)
  ) {
    return mergeFlatFilterValues(left as FilterValues, right as FilterValues);
  }

  const operands: SerializedFilter[] = [];

  if (!leftIsFlat && "operator" in left && left.operator === operator) {
    operands.push(...left.operands);
  } else {
    operands.push(left);
  }

  if (!rightIsFlat && "operator" in right && right.operator === operator) {
    operands.push(...right.operands);
  } else {
    operands.push(right);
  }

  return { operator, operands };
}

// ---------------------------------------------------------------------------
// Token → FilterValues (Leaf node generation)
// ---------------------------------------------------------------------------

export function tokensToFilterValues(
  tokens: ParsedQueryToken[],
  base: FilterValues
): FilterValues {
  const result: FilterValues = { ...base };
  for (const token of tokens) {
    applyToken(token, result);
  }
  return result;
}

function applyToken(token: ParsedQueryToken, values: FilterValues) {
  const v = token.value.trim();

  switch (token.kind) {
    case "verlag":
      if (v) values.publishers = dedupeByName([...values.publishers, { name: v }]);
      break;

    case "writer":
      if (v) values.individuals = mergeIndividual(values.individuals, v, "WRITER");
      break;

    case "penciler":
      if (v) values.individuals = mergeIndividual(values.individuals, v, "PENCILER");
      break;

    case "inker":
      if (v) values.individuals = mergeIndividual(values.individuals, v, "INKER");
      break;

    case "colorist":
      if (v) values.individuals = mergeIndividual(values.individuals, v, "COLORIST");
      break;

    case "letterer":
      if (v) values.individuals = mergeIndividual(values.individuals, v, "LETTERER");
      break;

    case "editor":
      if (v) values.individuals = mergeIndividual(values.individuals, v, "EDITOR");
      break;

    case "translator":
      if (v) values.individuals = mergeIndividual(values.individuals, v, "TRANSLATOR");
      break;

    case "crossPublishers":
      if (v) values.crossPublishers = dedupeByName([...values.crossPublishers, { name: v }]);
      break;

    case "crossSeries":
      if (v) {
        const [title, volumeRaw] = v.split("@");
        const volume = Number(volumeRaw ?? 1);
        values.crossSeries = dedupeByTitle([
          ...values.crossSeries,
          { title: title.trim(), volume: Number.isFinite(volume) ? volume : 1 },
        ]);
      }
      break;

    case "crossNumber":
      if (v) values.crossNumber = v;
      break;

    case "crossVolume":
      if (v) values.crossVolume = v;
      break;

    case "crossStartYear":
      if (v) values.crossStartYear = v;
      break;

    case "crossEndYear":
      if (v) values.crossEndYear = v;
      break;

    case "serie":
      if (v) {
        const [title, volumeRaw] = v.split("@");
        const volume = Number(volumeRaw ?? 1);
        values.series = dedupeByTitle([
          ...values.series,
          { title: title.trim(), volume: Number.isFinite(volume) ? volume : 1 },
        ]);
      }
      break;

    case "format":
      if (v) values.formats = dedupeFormats([...values.formats, { name: toTitleCase(v) }]);
      break;

    case "genre":
      if (v) values.genres = dedupeByName([...values.genres, { name: v }]);
      break;

    case "datum": {
      const date = v;
      const compare = token.compare ?? "=";
      if (!date) break;
      if (compare === "=") {
        values.releasedateExact = date;
        values.releasedateFrom = "";
        values.releasedateTo = "";
      } else if (compare === ">=" || compare === ">") {
        values.releasedateFrom = date;
        values.releasedateExact = "";
      } else if (compare === "<=" || compare === "<") {
        values.releasedateTo = date;
        values.releasedateExact = "";
      }
      break;
    }

    case "nummer": {
      const num = v;
      const compare = token.compare ?? "=";
      if (!num) break;
      const [n, variantRaw] = num.split("@");
      if (compare === "=") {
        values.numberExact = n;
        values.numberVariant = variantRaw ?? "";
        values.numberFrom = "";
        values.numberTo = "";
      } else if (compare === ">=" || compare === ">") {
        values.numberFrom = n;
        values.numberExact = "";
      } else if (compare === "<=" || compare === "<") {
        values.numberTo = n;
        values.numberExact = "";
      }
      break;
    }

    case "arc":
      if (v) values.arcs = dedupeByName([...values.arcs, { title: v }]);
      break;

    case "creator":
      if (v) values.individuals = dedupeByName([...values.individuals, { name: v }]);
      break;

    case "auftritt":
      if (v) values.appearances = dedupeByName([...values.appearances, { name: v }]);
      break;

    case "realitaet":
      if (v) values.realities = dedupeByName([...values.realities, { name: v }]);
      break;

    case "flag": {
      const targets = FLAG_MAP[token.value];
      if (!targets) break;
      for (const { field, value: flagValue } of targets) {
        (values as unknown as Record<string, unknown>)[field] = flagValue;
      }
      break;
    }

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Serializer & Query string generators
// ---------------------------------------------------------------------------

export function filterValuesToQueryString(
  filter: SerializedFilter,
  parentOperator?: "and" | "or"
): string {
  if (!filter) return "";

  if (!("operator" in filter)) {
    return flatFilterValuesToQueryString(filter);
  }

  const operator = filter.operator;
  const operandStrings = filter.operands
    .map(op => filterValuesToQueryString(op, operator))
    .filter(Boolean);

  if (operandStrings.length === 0) return "";
  if (operandStrings.length === 1) return operandStrings[0];

  const result = operator === "or" ? operandStrings.join(" OR ") : operandStrings.join(" AND ");

  const needsParens = (parentOperator === "and" && operator === "or") || (operator === "or" && !parentOperator);
  if (needsParens) {
    return `(${result})`;
  }

  return result;
}

function flatFilterValuesToQueryString(values: FilterValues): string {
  return flatFilterValuesToTokenStrings(values).join(" AND ");
}

function flatFilterValuesToTokenStrings(values: FilterValues): string[] {
  const parts: string[] = [];

  values.publishers?.forEach((p) => {
    if (p.name) parts.push(`v:${quoteIfSpace(p.name)}`);
  });

  values.series?.forEach((s) => {
    if (s.title) {
      const volSuffix = s.volume && s.volume !== 1 ? `@${s.volume}` : "";
      parts.push(`s:${quoteIfSpace(s.title + volSuffix)}`);
    }
  });

  values.formats?.forEach((f) => {
    if (f.name) parts.push(`f:${quoteIfSpace(f.name)}`);
  });

  values.genres?.forEach((g) => {
    if (g.name) parts.push(`g:${quoteIfSpace(g.name)}`);
  });

  if (values.releasedateExact) parts.push(`d:${values.releasedateExact}`);
  if (values.releasedateFrom) parts.push(`d:>=${values.releasedateFrom}`);
  if (values.releasedateTo) parts.push(`d:<=${values.releasedateTo}`);

  if (values.numberExact) {
    const varSuffix = values.numberVariant ? `@${values.numberVariant}` : "";
    parts.push(`n:${values.numberExact}${varSuffix}`);
  }
  if (values.numberFrom) parts.push(`n:>=${values.numberFrom}`);
  if (values.numberTo) parts.push(`n:<=${values.numberTo}`);

  values.arcs?.forEach((a) => {
    if (a.title) parts.push(`a:${quoteIfSpace(a.title)}`);
  });

  values.individuals?.forEach((i) => {
    if (i.name) {
      const roles = Array.isArray(i.role) ? i.role : typeof i.role === "string" ? [i.role] : [];
      if (roles.length > 0) {
        roles.forEach((role) => {
          const lower = role.toLowerCase();
          let prefix = "cr";
          if (lower === "writer") prefix = "w";
          else if (lower === "penciler") prefix = "pe";
          else if (lower === "inker") prefix = "i";
          else if (lower === "colorist") prefix = "co";
          else if (lower === "letterer") prefix = "le";
          else if (lower === "editor") prefix = "ed";
          else if (lower === "translator") prefix = "t";
          parts.push(`${prefix}:${quoteIfSpace(i.name!)}`);
        });
      } else {
        parts.push(`cr:${quoteIfSpace(i.name)}`);
      }
    }
  });

  values.appearances?.forEach((ap) => {
    if (ap.name) parts.push(`ap:${quoteIfSpace(ap.name)}`);
  });

  values.realities?.forEach((re) => {
    if (re.name) parts.push(`r:${quoteIfSpace(re.name)}`);
  });

  if (values.firstPrint) parts.push("erstdruck");
  else if (values.notFirstPrint) parts.push("kein-erstdruck");

  if (values.reprint) parts.push("nachdruck");
  else if (values.notReprint) parts.push("kein-nachdruck");

  if (values.exclusive) parts.push("exklusiv");
  else if (values.notExclusive) parts.push("kein-exklusiv");

  if (values.onlyCollected) parts.push("gesammelt");
  else if (values.onlyNotCollected) parts.push("nicht-gesammelt");

  if (values.onlyTb) parts.push("nur-taschenbuch");
  else if (values.notOnlyTb) parts.push("kein-taschenbuch");

  if (values.onlyPrint) parts.push("einzeln-erschienen");
  else if (values.notOnlyPrint) parts.push("mehrfach-erschienen");

  if (values.otherOnlyTb) parts.push("sonst-nur-tb");
  else if (values.notOtherOnlyTb) parts.push("nicht-sonst-nur-tb");

  if (values.onlyOnePrint) parts.push("nur-einmal-deutsch");
  else if (values.notOnlyOnePrint) parts.push("nicht-nur-einmal-deutsch");

  if (values.noPrint) parts.push("nicht-deutsch");
  else if (values.notNoPrint) parts.push("auch-deutsch");

  // New collection and admin flags
  if (values.onlyIssuesWithMultipleCollectedVariants) parts.push("mehrfach-gesammelt");
  if (values.onlyNeededIssues) parts.push("benötigt");
  if (values.onlyIncompleteSeries) parts.push("unvollständige-serien");
  if (values.onlyUnownedFirstPrints) parts.push("fehlende-erstausgaben");
  if (values.onlyUnownedPublisherFirstPrints) parts.push("fehlende-verlagserstausgaben");
  if (values.onlyDoubleTrippleCollected) parts.push("mehrfach-vorhanden");
  if (values.onlyDoubleTripplePublisherCollected) parts.push("mehrfach-vorhanden-verlag");
  if (values.onlyNotOwnedUsMaterial) parts.push("ungesammeltes-us-material");
  if (values.onlyNewUsMaterial) parts.push("us-material-neu");
  if (values.onlySellingList) parts.push("verkaufsliste");
  if (values.noComicguideId) parts.push("ohne-comicguide");
  if (values.noContent) parts.push("ohne-stories");
  if (values.onlyFirstOfMonthRelease) parts.push("erstes-des-monats");
  if (values.withVariants) parts.push("mit-varianten");
  if (values.onlyNotCollectedNoOwnedVariants) parts.push("nicht-gesammelt-ohne-varianten");
  if (values.contentFilterMode === "and") parts.push("inhalt-und");

  // New cross-scope fields
  values.crossPublishers?.forEach((p) => {
    if (p.name) parts.push(`xv:${quoteIfSpace(p.name)}`);
  });

  values.crossSeries?.forEach((s) => {
    if (s.title) {
      const volSuffix = s.volume && s.volume !== 1 ? `@${s.volume}` : "";
      parts.push(`xs:${quoteIfSpace(s.title + volSuffix)}`);
    }
  });

  if (values.crossNumber) parts.push(`xn:${values.crossNumber}`);
  if (values.crossVolume) parts.push(`xvol:${values.crossVolume}`);
  if (values.crossStartYear) parts.push(`xyear:${values.crossStartYear}`);
  if (values.crossEndYear) parts.push(`xend:${values.crossEndYear}`);
  if (values.crossExclusive) parts.push("xexklusiv");

  return parts;
}

// ---------------------------------------------------------------------------
// External API: parseQueryString + queryStringToFilterValues
// ---------------------------------------------------------------------------

export function parseQueryString(raw: string): { tokens: ParsedQueryToken[]; freetext: string } {
  const allTokens = tokenize(raw);
  const filterTokens = allTokens
    .filter((t): t is { type: "FILTER"; token: ParsedQueryToken } => t.type === "FILTER")
    .map(t => t.token);
  const freetext = allTokens
    .filter((t): t is { type: "FREETEXT"; value: string } => t.type === "FREETEXT")
    .map(t => t.value)
    .join(" ");

  return { tokens: filterTokens, freetext };
}

export function queryStringToFilterValues(
  raw: string,
  base: FilterValues
): {
  values: SerializedFilter;
  freetext: string;
} {
  const allTokens = tokenize(raw);
  const freetext = allTokens
    .filter((t): t is { type: "FREETEXT"; value: string } => t.type === "FREETEXT")
    .map(t => t.value)
    .join(" ");

  const activeTokens = allTokens.filter(t => t.type !== "FREETEXT");
  if (activeTokens.length === 0) {
    return { values: base, freetext };
  }

  let pos = 0;
  function peek() { return activeTokens[pos]; }
  function next() { return activeTokens[pos++]; }

  function parseExpression(): SerializedFilter {
    let node = parseTerm();
    while (peek()?.type === "OR") {
      next();
      const right = parseTerm();
      node = combineNodes("or", node, right);
    }
    return node;
  }

  function parseTerm(): SerializedFilter {
    let node = parseFactor();
    while (true) {
      const nextTok = peek();
      if (!nextTok) break;
      if (nextTok.type === "OR" || nextTok.type === "RPAREN") break;

      if (nextTok.type === "AND") {
        next();
        const right = parseFactor();
        node = combineNodes("and", node, right);
      } else {
        const right = parseFactor();
        node = combineNodes("and", node, right);
      }
    }
    return node;
  }

  function parseFactor(): SerializedFilter {
    const tok = next();
    if (!tok) return base;

    if (tok.type === "LPAREN") {
      const expr = parseExpression();
      if (peek()?.type === "RPAREN") next();
      return expr;
    }

    if (tok.type === "FILTER") {
      const leaf = { ...base };
      const freshLeaf = tokensToFilterValues([tok.token], resetToDefaults(leaf));
      return freshLeaf;
    }

    return base;
  }

  const values = parseExpression();
  return { values, freetext };
}

// ---------------------------------------------------------------------------
// Chip Flattening Utility
// ---------------------------------------------------------------------------

export function flattenFilterToChips(
  filter: SerializedFilter,
  parentOperator?: "and" | "or"
): RenderChipToken[] {
  if (!filter) return [];

  if (!("operator" in filter)) {
    const rawTokens = flatFilterValuesToTokenStrings(filter);
    if (rawTokens.length > 1) {
      const structuredAST = flatFilterValuesToAST(filter);
      return flattenFilterToChips(structuredAST, parentOperator);
    }
    return rawTokens.map(raw => {
      const lexed = tokenize(raw);
      const label = lexed.length > 0 && lexed[0].type === "FILTER"
        ? tokenToChipLabel(lexed[0].token)
        : raw;
      return { type: "filter", value: label, raw };
    });
  }

  const operator = filter.operator;
  const chips: RenderChipToken[] = [];

  for (let i = 0; i < filter.operands.length; i++) {
    const child = filter.operands[i];
    const childChips = flattenFilterToChips(child, operator);

    if (childChips.length === 0) continue;

    if (i > 0 && chips.length > 0) {
      if (operator === "or") {
        chips.push({ type: "operator", value: "OR", raw: "OR" });
      } else if (operator === "and") {
        chips.push({ type: "operator", value: "AND", raw: "AND" });
      }
    }

    chips.push(...childChips);
  }

  const needsParens = (parentOperator === "and" && operator === "or") || (operator === "or" && !parentOperator);
  if (needsParens && chips.length > 0) {
    return [
      { type: "parenthesis", value: "(", raw: "(" },
      ...chips,
      { type: "parenthesis", value: ")", raw: ")" }
    ];
  }

  return chips;
}

// ---------------------------------------------------------------------------
// Chip Labels and Formats
// ---------------------------------------------------------------------------

export function tokenToChipLabel(token: ParsedQueryToken): string {
  switch (token.kind) {
    case "verlag":   return `Verlag: ${token.value}`;
    case "serie":    return `Serie: ${token.value}`;
    case "format":   return `Format: ${token.value}`;
    case "genre":    return `Genre: ${token.value}`;
    case "arc":      return `Arc: ${token.value}`;
    case "creator":  return `Person: ${token.value}`;
    case "auftritt": return `Auftritt: ${token.value}`;
    case "realitaet":return `Realität: ${token.value}`;
    case "writer":      return `Autor: ${token.value}`;
    case "penciler":    return `Zeichner: ${token.value}`;
    case "inker":       return `Inker: ${token.value}`;
    case "colorist":    return `Kolorist: ${token.value}`;
    case "letterer":    return `Letterer: ${token.value}`;
    case "editor":      return `Editor: ${token.value}`;
    case "translator":  return `Übersetzer: ${token.value}`;
    case "crossPublishers": return `Cross-Verlag: ${token.value}`;
    case "crossSeries":     return `Cross-Serie: ${token.value}`;
    case "crossNumber":     return `Cross-Nr.: ${token.value}`;
    case "crossVolume":     return `Cross-Volume: ${token.value}`;
    case "crossStartYear":  return `Cross-Startjahr: ${token.value}`;
    case "crossEndYear":    return `Cross-Endjahr: ${token.value}`;
    case "datum": {
      const op = token.compare === ">=" ? "ab " : token.compare === "<=" ? "bis " : "";
      return `Datum: ${op}${token.value}`;
    }
    case "nummer": {
      const op = token.compare === ">=" ? "ab " : token.compare === "<=" ? "bis " : "";
      return `Nr.: ${op}${token.value}`;
    }
    case "flag":     return flagLabel(token.value);
    default:         return token.raw;
  }
}

function flagLabel(flag: string): string {
  const labels: Record<string, string> = {
    erstdruck: "Erstdruck",
    "kein-erstdruck": "Kein Erstdruck",
    nachdruck: "Nachdruck",
    "kein-nachdruck": "Kein Nachdruck",
    exklusiv: "Exklusiv",
    "kein-exklusiv": "Kein Exklusiv",
    gesammelt: "Gesammelt",
    "nicht-gesammelt": "Nicht gesammelt",
    "nur-taschenbuch": "Nur TB",
    "kein-taschenbuch": "Kein nur-TB",
    firstprint: "Erstdruck",
    "no-firstprint": "Kein Erstdruck",
    reprint: "Nachdruck",
    "no-reprint": "Kein Nachdruck",
    exclusive: "Exklusiv",
    "no-exclusive": "Kein Exklusiv",
    collected: "Gesammelt",
    "not-collected": "Nicht gesammelt",
    "tb-only": "Nur TB",
    "no-tb": "Kein nur-TB",
    "einzeln-erschienen": "Einzige Veröffentlichung",
    "only-print": "Einzige Veröffentlichung",
    "mehrfach-erschienen": "Mehrere Veröffentlichungen",
    "not-only-print": "Mehrere Veröffentlichungen",
    "sonst-nur-tb": "Sonst nur TB",
    "other-only-tb": "Sonst nur TB",
    "nicht-sonst-nur-tb": "Nicht sonst nur TB",
    "not-other-only-tb": "Nicht sonst nur TB",
    "nur-einmal-deutsch": "Nur 1x dt.",
    "only-one-print": "Nur 1x dt.",
    "nicht-nur-einmal-deutsch": "Nicht nur 1x dt.",
    "not-only-one-print": "Nicht nur 1x dt.",
    "nicht-deutsch": "Nicht dt. erschienen",
    "no-print": "Nicht dt. erschienen",
    "auch-deutsch": "Auch dt. erschienen",
    "not-no-print": "Auch dt. erschienen",
    "mehrfach-gesammelt": "Mehr als eine Variante gesammelt",
    "multiple-collected": "Mehr als eine Variante gesammelt",
    "benötigt": "Benötigte Ausgaben",
    "benoetigt": "Benötigte Ausgaben",
    needed: "Benötigte Ausgaben",
    "unvollständige-serien": "Unvollständige Serien",
    "unvollstaendige-serien": "Unvollständige Serien",
    "incomplete-series": "Unvollständige Serien",
    "fehlende-erstausgaben": "Fehlende Erstausgaben",
    "unowned-firstprints": "Fehlende Erstausgaben",
    "fehlende-verlagserstausgaben": "Fehlende Verlagserstausgaben",
    "unowned-publisher-firstprints": "Fehlende Verlagserstausgaben",
    "mehrfach-vorhanden": "Doppelt/Dreifach gesammelt",
    "double-collected": "Doppelt/Dreifach gesammelt",
    "mehrfach-vorhanden-verlag": "Doppelt/Dreifach gesammelt (verlag)",
    "double-publisher-collected": "Doppelt/Dreifach gesammelt (verlag)",
    "us-material-neu": "US-Material ab 2025",
    "new-us-material": "US-Material ab 2025",
    verkaufsliste: "Verkaufsliste",
    "selling-list": "Verkaufsliste",
    "ohne-comicguide": "Ohne Comicguide ID",
    "no-comicguide": "Ohne Comicguide ID",
    "ohne-stories": "Ohne Stories",
    "ohne-inhalt": "Ohne Stories",
    "no-content": "Ohne Stories",
    "erstes-des-monats": "Am 01. des Monats",
    "first-of-month": "Am 01. des Monats",
    "mit-varianten": "Mit Varianten",
    "with-variants": "Mit Varianten",
    "nicht-gesammelt-ohne-varianten": "Ungesammelt (ohne Variants)",
    "not-collected-no-owned-variants": "Ungesammelt (ohne Variants)",
    "ungesammeltes-us-material": "Ungesammeltes US-Material",
    "us-material-ungesammelt": "Ungesammeltes US-Material",
    "uncollected-us-material": "Ungesammeltes US-Material",
    "inhalt-und": "Inhalts-Verknüpfung: UND",
    "content-and": "Inhalts-Verknüpfung: UND",
    "inhalt-oder": "Inhalts-Verknüpfung: ODER",
    "content-or": "Inhalts-Verknüpfung: ODER",
    "xexklusiv": "Cross-Scope exklusiv",
    "xexclusive": "Cross-Scope exklusiv",
    "cross-exclusive": "Cross-Scope exklusiv",
  };
  return labels[flag] ?? flag;
}

// ---------------------------------------------------------------------------
// Helpers / Deduplication / Merging
// ---------------------------------------------------------------------------

function quoteIfSpace(val: string): string {
  if (val.includes(" ")) {
    return `"${val}"`;
  }
  return val;
}

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function normalizeCompare(raw: string): CompareOp | undefined {
  if (raw === ">=" || raw === "<=" || raw === ">" || raw === "<" || raw === "=") return raw;
  if (raw === "") return "=";
  return undefined;
}

function dedupeByName<T extends { name?: string; title?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = ((item.name || item.title) ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeByTitle<T extends { title?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = (item.title ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeFormats(items: Array<{ name: string }>): Array<{ name: string }> {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeIndividual(individuals: FieldItem[], name: string, role: string): FieldItem[] {
  const normalizedRole = role.toUpperCase();
  const existing = individuals.find(
    (item) => (item.name ?? "").toLowerCase().trim() === name.toLowerCase().trim()
  );

  if (existing) {
    const roles = Array.isArray(existing.role)
      ? existing.role
      : typeof existing.role === "string" && existing.role
      ? [existing.role]
      : [];
    if (!roles.includes(normalizedRole)) {
      roles.push(normalizedRole);
    }
    existing.role = roles;
    existing.type = roles;
    return [...individuals];
  }

  return [...individuals, { name, role: [normalizedRole], type: [normalizedRole] }];
}

function mergeIndividualsList(a: FieldItem[], b: FieldItem[]): FieldItem[] {
  const result = a.map(item => ({
    ...item,
    role: Array.isArray(item.role) ? [...item.role] : item.role ? [item.role] : [],
    type: Array.isArray(item.type) ? [...item.type] : item.type ? [item.type] : []
  }));
  for (const item of b) {
    const name = item.name;
    if (!name) continue;
    const existing = result.find(r => (r.name ?? "").toLowerCase().trim() === name.toLowerCase().trim());
    if (existing) {
      const existingRoles = Array.isArray(existing.role) ? existing.role : [];
      const newRoles = Array.isArray(item.role) ? item.role : typeof item.role === "string" ? [item.role] : [];
      for (const r of newRoles) {
        if (!existingRoles.includes(r)) {
          existingRoles.push(r);
        }
      }
      existing.role = existingRoles;
      existing.type = existingRoles;
    } else {
      result.push({
        ...item,
        role: Array.isArray(item.role) ? [...item.role] : typeof item.role === "string" ? [item.role] : [],
        type: Array.isArray(item.type) ? [...item.type] : typeof item.type === "string" ? [item.type] : []
      });
    }
  }
  return result;
}

function resetToDefaults(val: FilterValues): FilterValues {
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
    contentFilterMode: "or",
    crossExclusive: false,
  };
}

export function mergeFlatFilterValues(a: FilterValues, b: FilterValues): FilterValues {
  const result = { ...a };

  if (b.formats?.length) result.formats = dedupeFormats([...result.formats, ...b.formats]);
  if (b.publishers?.length) result.publishers = dedupeByName([...result.publishers, ...b.publishers]);
  if (b.series?.length) result.series = dedupeByTitle([...result.series, ...b.series]);
  if (b.genres?.length) result.genres = dedupeByName([...result.genres, ...b.genres]);
  if (b.arcs?.length) result.arcs = dedupeByName([...result.arcs, ...b.arcs]);
  if (b.individuals?.length) result.individuals = mergeIndividualsList(result.individuals, b.individuals);
  if (b.appearances?.length) result.appearances = dedupeByName([...result.appearances, ...b.appearances]);
  if (b.realities?.length) result.realities = dedupeByName([...result.realities, ...b.realities]);
  if (b.crossPublishers?.length) result.crossPublishers = dedupeByName([...result.crossPublishers, ...b.crossPublishers]);
  if (b.crossSeries?.length) result.crossSeries = dedupeByTitle([...result.crossSeries, ...b.crossSeries]);

  if (b.withVariants) result.withVariants = true;
  if (b.firstPrint) result.firstPrint = true;
  if (b.notFirstPrint) result.notFirstPrint = true;
  if (b.onlyPrint) result.onlyPrint = true;
  if (b.notOnlyPrint) result.notOnlyPrint = true;
  if (b.onlyTb) result.onlyTb = true;
  if (b.notOnlyTb) result.notOnlyTb = true;
  if (b.exclusive) result.exclusive = true;
  if (b.notExclusive) result.notExclusive = true;
  if (b.reprint) result.reprint = true;
  if (b.notReprint) result.notReprint = true;
  if (b.otherOnlyTb) result.otherOnlyTb = true;
  if (b.notOtherOnlyTb) result.notOtherOnlyTb = true;
  if (b.onlyOnePrint) result.onlyOnePrint = true;
  if (b.notOnlyOnePrint) result.notOnlyOnePrint = true;
  if (b.noPrint) result.noPrint = true;
  if (b.notNoPrint) result.notNoPrint = true;
  if (b.onlyCollected) result.onlyCollected = true;
  if (b.onlyNotCollected) result.onlyNotCollected = true;
  if (b.onlyNotCollectedNoOwnedVariants) result.onlyNotCollectedNoOwnedVariants = true;
  if (b.noComicguideId) result.noComicguideId = true;
  if (b.noContent) result.noContent = true;
  if (b.onlyDoubleTrippleCollected) result.onlyDoubleTrippleCollected = true;
  if (b.onlyDoubleTripplePublisherCollected) result.onlyDoubleTripplePublisherCollected = true;
  if (b.onlyNotOwnedUsMaterial) result.onlyNotOwnedUsMaterial = true;
  if (b.onlyIssuesWithMultipleCollectedVariants) result.onlyIssuesWithMultipleCollectedVariants = true;
  if (b.onlyNeededIssues) result.onlyNeededIssues = true;
  if (b.onlyIncompleteSeries) result.onlyIncompleteSeries = true;
  if (b.onlyUnownedFirstPrints) result.onlyUnownedFirstPrints = true;
  if (b.onlyUnownedPublisherFirstPrints) result.onlyUnownedPublisherFirstPrints = true;
  if (b.onlyNewUsMaterial) result.onlyNewUsMaterial = true;
  if (b.onlySellingList) result.onlySellingList = true;
  if (b.onlyFirstOfMonthRelease) result.onlyFirstOfMonthRelease = true;
  if (b.crossExclusive) result.crossExclusive = true;

  if (b.releasedateFrom) result.releasedateFrom = b.releasedateFrom;
  if (b.releasedateTo) result.releasedateTo = b.releasedateTo;
  if (b.releasedateExact) result.releasedateExact = b.releasedateExact;
  if (b.numberFrom) result.numberFrom = b.numberFrom;
  if (b.numberTo) result.numberTo = b.numberTo;
  if (b.numberExact) result.numberExact = b.numberExact;
  if (b.numberVariant) result.numberVariant = b.numberVariant;
  if (b.crossNumber) result.crossNumber = b.crossNumber;
  if (b.crossVolume) result.crossVolume = b.crossVolume;
  if (b.crossStartYear) result.crossStartYear = b.crossStartYear;
  if (b.crossEndYear) result.crossEndYear = b.crossEndYear;

  if (b.contentFilterMode !== "and") result.contentFilterMode = b.contentFilterMode;

  return result;
}

export function flattenASTToFlatFilterValues(
  filter: SerializedFilter,
  base: FilterValues
): FilterValues {
  if (!filter) return base;
  if ("operator" in filter && Array.isArray(filter.operands)) {
    let result = { ...base };
    for (const op of filter.operands) {
      result = mergeFlatFilterValues(result, flattenASTToFlatFilterValues(op, base));
    }
    return result;
  }
  return mergeFlatFilterValues(base, filter as FilterValues);
}

export function flatFilterValuesToAST(values: FilterValues): SerializedFilter {
  const constraintStrings = flatFilterValuesToTokenStrings(values);
  if (constraintStrings.length <= 1) {
    return values;
  }

  const groups: Record<string, string[]> = {};
  constraintStrings.forEach((str) => {
    const lexed = tokenize(str);
    let groupKey = "freetext";
    if (lexed.length > 0) {
      if (lexed[0].type === "FILTER") {
        if (lexed[0].token.kind === "flag") {
          groupKey = `flag-${lexed[0].token.value}`;
        } else {
          groupKey = lexed[0].token.kind;
        }
      } else if (lexed[0].type === "FREETEXT") {
        groupKey = `freetext-${lexed[0].value.toLowerCase()}`;
      }
    }
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(str);
  });

  const groupASTs: SerializedFilter[] = [];
  const defaultBase = resetToDefaults(values);

  Object.values(groups).forEach((strs) => {
    if (strs.length === 1) {
      const { values: leafValues } = queryStringToFilterValues(strs[0], defaultBase);
      groupASTs.push(leafValues);
    } else {
      const operands = strs.map((str) => {
        const { values: leafValues } = queryStringToFilterValues(str, defaultBase);
        return leafValues;
      });
      groupASTs.push({ operator: "or", operands });
    }
  });

  if (groupASTs.length === 1) {
    return groupASTs[0];
  }

  return {
    operator: "and",
    operands: groupASTs,
  };
}

export function validateQuery(query: string): { valid: boolean; error: string | null } {
  const trimmed = query.trim();
  if (!trimmed) {
    return { valid: true, error: null };
  }

  // 1. Parentheses balance check
  let parenDepth = 0;
  for (let idx = 0; idx < trimmed.length; idx++) {
    if (trimmed[idx] === "(") {
      parenDepth++;
    } else if (trimmed[idx] === ")") {
      parenDepth--;
      if (parenDepth < 0) {
        return { valid: false, error: "Schließende Klammer ohne passende öffnende Klammer." };
      }
    }
  }
  if (parenDepth > 0) {
    return { valid: false, error: "Nicht geschlossene Klammer vorhanden." };
  }

  // 2. Token Grammar checks
  const allTokens = tokenize(query);

  // Check for empty filter prefixes (e.g. v:)
  for (const tok of allTokens) {
    if (tok.type === "FILTER" && !tok.token.value) {
      return {
        valid: false,
        error: `Unvollständiger Filter: "${tok.token.raw}" benötigt einen Wert (z.B. "${tok.token.raw}Wert").`,
      };
    }
  }

  // Check for consecutive / dangling operators
  let lastType: "operand" | "operator" | null = null;
  let lastToken: LexToken | null = null;

  for (const tok of allTokens) {
    if (tok.type === "AND" || tok.type === "OR") {
      if (lastToken?.type === "LPAREN") {
        return {
          valid: false,
          error: `Klammer darf nicht mit Operator "${tok.type}" beginnen.`,
        };
      }
      if (lastType === "operator" || lastType === null) {
        return {
          valid: false,
          error: `Ungültige Operator-Reihenfolge: "${tok.type}" steht an falscher Stelle.`,
        };
      }
      lastType = "operator";
    } else if (tok.type === "FILTER" || tok.type === "FREETEXT") {
      lastType = "operand";
    } else if (tok.type === "RPAREN") {
      if (lastType === "operator") {
        return {
          valid: false,
          error: `Operator vor schließender Klammer ist ungültig.`,
        };
      }
    }
    lastToken = tok;
  }

  if (lastType === "operator") {
    return {
      valid: false,
      error: `Filter darf nicht mit einem Operator enden.`,
    };
  }

  return { valid: true, error: null };
}

