import type { FieldItem } from "../../util/filterFieldHelpers";
import { FILTER_MULTI_VALUE_SEPARATOR } from "./constants";
import { FilterDateOption, FilterFormatOption, FilterNumberOption, FilterValues } from "./types";

function isFormatNameObject(value: unknown): value is FilterFormatOption {
  return Boolean(value && typeof value === "object" && "name" in value);
}

function normalizeFormats(rawFormats: unknown): FilterFormatOption[] {
  if (!Array.isArray(rawFormats)) {
    return [];
  }

  return rawFormats
    .map((format) => {
      if (typeof format === "string") {
        return { name: format };
      }

      if (isFormatNameObject(format)) {
        const typedFormat = format as { name?: unknown };
        if (typeof typedFormat.name === "string") {
          return { name: typedFormat.name };
        }
      }

      return null;
    })
    .filter((format): format is FilterFormatOption => Boolean(format));
}

function normalizeSeries(rawSeries: unknown): FieldItem[] {
  if (!Array.isArray(rawSeries)) {
    return [];
  }

  return rawSeries
    .filter((entry): entry is FieldItem => Boolean(entry && typeof entry === "object"))
    .map((entry) => ({ ...entry, __typename: "Series" }));
}

function splitMultiValueString(value: string): string[] {
  return value
    .split(FILTER_MULTI_VALUE_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeText(value: unknown): string {
  return readTextValue(value).toLowerCase();
}

function normalizeGenreFilters(rawGenres: unknown): FieldItem[] {
  const uniqueGenres = new Map<string, FieldItem>();

  const addGenre = (value: unknown) => {
    const name = readTextValue(value);
    if (!name) return;

    const key = normalizeText(name);
    if (!uniqueGenres.has(key)) uniqueGenres.set(key, { name });
  };

  if (Array.isArray(rawGenres)) {
    rawGenres.forEach((entry) => {
      if (typeof entry === "string") {
        addGenre(entry);
        return;
      }
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
      addGenre((entry as { name?: unknown }).name);
    });
    return [...uniqueGenres.values()];
  }

  if (typeof rawGenres === "string") {
    splitMultiValueString(rawGenres).forEach((entry) => addGenre(entry));
    return [...uniqueGenres.values()];
  }

  return [];
}

function normalizeArcFilters(rawArcs: unknown): FilterValues["arcs"] {
  if (Array.isArray(rawArcs)) {
    return rawArcs
      .map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
        const title = readTextValue((entry as { title?: unknown }).title);
        if (!title) return null;
        const typeValue = (entry as { type?: unknown }).type;
        return typeof typeValue === "string" && typeValue.trim()
          ? { title, type: typeValue.trim() }
          : { title };
      })
      .filter((entry): entry is { title: string; type?: string } => Boolean(entry));
  }

  if (typeof rawArcs === "string") {
    return splitMultiValueString(rawArcs).map((title) => ({ title }));
  }

  return [];
}

function normalizeAppearanceFilters(rawAppearances: unknown): FilterValues["appearances"] {
  if (Array.isArray(rawAppearances)) {
    return rawAppearances
      .map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
        const name = readTextValue((entry as { name?: unknown }).name);
        if (!name) return null;
        const typeValue = (entry as { type?: unknown }).type;
        return typeof typeValue === "string" && typeValue.trim()
          ? { name, type: typeValue.trim() }
          : { name };
      })
      .filter((entry): entry is { name: string; type?: string } => Boolean(entry));
  }

  if (typeof rawAppearances === "string") {
    return splitMultiValueString(rawAppearances).map((name) => ({ name }));
  }

  return [];
}

function normalizeRealityFilters(rawRealities: unknown): FilterValues["realities"] {
  if (Array.isArray(rawRealities)) {
    return rawRealities
      .map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
        const name = readTextValue((entry as { name?: unknown }).name);
        if (!name) return null;
        return { name };
      })
      .filter((entry): entry is { name: string } => Boolean(entry));
  }

  if (typeof rawRealities === "string") {
    return splitMultiValueString(rawRealities).map((name) => ({ name }));
  }

  return [];
}

export function createDefaultFilterValues(): FilterValues {
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
  };
}

function normalizeReleaseDateInputs(
  rawReleasedates: unknown
): Pick<FilterValues, "releasedateFrom" | "releasedateTo" | "releasedateExact"> {
  const result = {
    releasedateFrom: "",
    releasedateTo: "",
    releasedateExact: "",
  };
  if (!Array.isArray(rawReleasedates)) return result;

  const values = rawReleasedates.filter(Boolean) as Array<FilterDateOption>;
  const exact = values.find(
    (entry) => entry.compare === "=" && readTextValue(entry.date) !== ""
  );
  if (exact) {
    result.releasedateExact = readTextValue(exact.date);
    return result;
  }

  const from = values.find(
    (entry) =>
      (entry.compare === ">=" || entry.compare === ">") && readTextValue(entry.date) !== ""
  );
  const to = values.find(
    (entry) =>
      (entry.compare === "<=" || entry.compare === "<") && readTextValue(entry.date) !== ""
  );

  result.releasedateFrom = from ? readTextValue(from.date) : "";
  result.releasedateTo = to ? readTextValue(to.date) : "";
  return result;
}

function normalizeNumberInputs(
  rawNumbers: unknown
): Pick<FilterValues, "numberFrom" | "numberTo" | "numberExact" | "numberVariant"> {
  const result = {
    numberFrom: "",
    numberTo: "",
    numberExact: "",
    numberVariant: "",
  };
  if (!Array.isArray(rawNumbers)) return result;

  const values = rawNumbers.filter(Boolean) as Array<FilterNumberOption>;
  const exactValues = values
    .filter((entry) => entry.compare === "=" && readTextValue(entry.number) !== "")
    .map((entry) => readTextValue(entry.number));
  if (exactValues.length > 0) {
    result.numberExact = exactValues.join(", ");
    const exactWithVariant = values.find(
      (entry) =>
        entry.compare === "=" &&
        readTextValue(entry.number) !== "" &&
        readTextValue(entry.variant) !== ""
    );
    if (exactWithVariant) result.numberVariant = readTextValue(exactWithVariant.variant);
    return result;
  }

  const from = values.find(
    (entry) =>
      (entry.compare === ">=" || entry.compare === ">") && readTextValue(entry.number) !== ""
  );
  const to = values.find(
    (entry) =>
      (entry.compare === "<=" || entry.compare === "<") && readTextValue(entry.number) !== ""
  );

  result.numberFrom = from ? readTextValue(from.number) : "";
  result.numberTo = to ? readTextValue(to.number) : "";
  const rangeWithVariant = values.find(
    (entry) =>
      (entry.compare === ">=" ||
        entry.compare === ">" ||
        entry.compare === "<=" ||
        entry.compare === "<") &&
      readTextValue(entry.variant) !== ""
  );
  if (rangeWithVariant) result.numberVariant = readTextValue(rangeWithVariant.variant);
  return result;
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

export function parseFilterValues(queryFilter?: string): FilterValues {
  const defaults = createDefaultFilterValues();

  if (!queryFilter) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(queryFilter) as Partial<FilterValues> & {
      releasedates?: unknown;
      numbers?: unknown;
    };
    const normalizedReleasedateInputs = normalizeReleaseDateInputs(parsed.releasedates);
    const normalizedNumberInputs = normalizeNumberInputs(parsed.numbers);

    const onlyCollected = Boolean(parsed.onlyCollected);
    const onlyNotCollectedNoOwnedVariants =
      !onlyCollected &&
      Boolean(
        (parsed as { onlyNotCollectedNoOwnedVariants?: unknown }).onlyNotCollectedNoOwnedVariants
      );
    const onlyNotCollected =
      !onlyCollected && !onlyNotCollectedNoOwnedVariants && Boolean(parsed.onlyNotCollected);

    const parseNegatablePair = (
      positiveValue: unknown,
      negativeValue: unknown
    ): [boolean, boolean] => {
      const positive = Boolean(positiveValue);
      const negative = !positive && Boolean(negativeValue);
      return [positive, negative];
    };

    const [firstPrint, notFirstPrint] = parseNegatablePair(parsed.firstPrint, parsed.notFirstPrint);
    const [onlyPrint, notOnlyPrint] = parseNegatablePair(parsed.onlyPrint, parsed.notOnlyPrint);
    const [onlyTb, notOnlyTb] = parseNegatablePair(parsed.onlyTb, parsed.notOnlyTb);
    const [exclusive, notExclusive] = parseNegatablePair(parsed.exclusive, parsed.notExclusive);
    const [reprint, notReprint] = parseNegatablePair(parsed.reprint, parsed.notReprint);
    const [otherOnlyTb, notOtherOnlyTb] = parseNegatablePair(
      parsed.otherOnlyTb,
      parsed.notOtherOnlyTb
    );
    const [onlyOnePrint, notOnlyOnePrint] = parseNegatablePair(
      parsed.onlyOnePrint,
      parsed.notOnlyOnePrint
    );
    const [noPrint, notNoPrint] = parseNegatablePair(parsed.noPrint, parsed.notNoPrint);

    return {
      ...defaults,
      ...parsed,
      formats: normalizeFormats(parsed.formats),
      ...normalizedReleasedateInputs,
      publishers: Array.isArray(parsed.publishers) ? parsed.publishers : defaults.publishers,
      series: normalizeSeries(parsed.series),
      genres: normalizeGenreFilters(parsed.genres),
      ...normalizedNumberInputs,
      individuals: Array.isArray(parsed.individuals) ? parsed.individuals : defaults.individuals,
      arcs: normalizeArcFilters(parsed.arcs),
      appearances: normalizeAppearanceFilters(parsed.appearances),
      realities: normalizeRealityFilters(parsed.realities),
      withVariants: Boolean(parsed.withVariants),
      firstPrint,
      notFirstPrint,
      onlyPrint,
      notOnlyPrint,
      onlyTb,
      notOnlyTb,
      exclusive,
      notExclusive,
      reprint,
      notReprint,
      otherOnlyTb,
      notOtherOnlyTb,
      onlyOnePrint,
      notOnlyOnePrint,
      noPrint,
      notNoPrint,
      onlyCollected,
      onlyNotCollected,
      onlyNotCollectedNoOwnedVariants,
      noComicguideId:
        Boolean((parsed as { noComicguideId?: unknown }).noComicguideId) ||
        Boolean((parsed as { noCover?: unknown }).noCover),
      noContent: Boolean(parsed.noContent),
    };
  } catch {
    return defaults;
  }
}
