import { stripItem } from "../../util/util";
import { FilterSubmitValues, FilterValues } from "./types";

function hasPayload(payload: FilterSubmitValues): boolean {
  return Object.keys(payload).length > 0;
}

function applyNegatableFlag(
  payload: FilterSubmitValues,
  positive: boolean,
  negative: boolean,
  positiveKey: string,
  negativeKey: string
) {
  const mutablePayload = payload as Record<string, unknown>;
  if (positive) {
    mutablePayload[positiveKey] = true;
    return;
  }
  if (negative) {
    mutablePayload[negativeKey] = true;
  }
}

function splitExactNumbers(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry, index, arr) => entry.length > 0 && arr.indexOf(entry) === index);
}

function normalizeUniqueNames(values: Array<{ name?: unknown }>): string[] {
  const unique = new Map<string, string>();

  values.forEach((entry) => {
    const name = readTextValue(entry.name);
    if (!name) return;

    const key = name.toLowerCase();
    if (!unique.has(key)) unique.set(key, name);
  });

  return [...unique.values()];
}

function readReleasedates(values: FilterValues) {
  const releasedateExact = values.releasedateExact.trim();
  if (releasedateExact) {
    return [{ compare: "=", date: releasedateExact }];
  }

  const releasedateFrom = values.releasedateFrom.trim();
  const releasedateTo = values.releasedateTo.trim();
  const releasedates = [];
  if (releasedateFrom) releasedates.push({ compare: ">=", date: releasedateFrom });
  if (releasedateTo) releasedates.push({ compare: "<=", date: releasedateTo });
  return releasedates;
}

function readSeriesPayload(values: FilterValues) {
  return values.series
    .map((entry) => {
      const normalized = stripItem(entry);
      const volume = Number(normalized.volume);
      if (!Number.isFinite(volume)) return null;
      normalized.volume = volume;
      return normalized;
    })
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function readNumberPayload(values: FilterValues) {
  const numbers = [];
  const numberVariant = "";
  const numberExact = splitExactNumbers(values.numberExact);
  if (numberExact.length > 0) {
    numberExact.forEach((number) => {
      numbers.push({ compare: "=", number, variant: numberVariant });
    });
    return numbers;
  }

  const numberFrom = values.numberFrom.trim();
  const numberTo = values.numberTo.trim();
  if (numberFrom) numbers.push({ compare: ">=", number: numberFrom, variant: numberVariant });
  if (numberTo) numbers.push({ compare: "<=", number: numberTo, variant: numberVariant });
  return numbers;
}

function applyCollectionFlags(payload: FilterSubmitValues, values: FilterValues) {
  if (values.onlyCollected) {
    payload.onlyCollected = true;
    return;
  }

  if (values.onlyNotCollectedNoOwnedVariants) {
    payload.onlyNotCollectedNoOwnedVariants = true;
    return;
  }

  if (values.onlyNotCollected) {
    payload.onlyNotCollected = true;
  }
}

export function serializeFilterValues(
  values: FilterValues,
  us: boolean
): FilterSubmitValues | null {
  const payload: FilterSubmitValues = {};

  if (values.formats.length > 0) {
    payload.formats = values.formats.map((option) => option.name);
  }

  if (values.withVariants) {
    payload.withVariants = true;
  }

  const releasedates = readReleasedates(values);
  if (releasedates.length > 0) {
    payload.releasedates = releasedates;
  }

  if (values.publishers.length > 0) {
    payload.publishers = values.publishers.map((publisher) => {
      const normalizedPublisher = stripItem(publisher);
      normalizedPublisher.us = undefined;
      return normalizedPublisher;
    });
  }

  if (values.series.length > 0) {
    payload.series = readSeriesPayload(values);
  }

  if (values.genres.length > 0) {
    const genres = normalizeUniqueNames(values.genres);
    if (genres.length > 0) payload.genres = genres;
  }

  const numbers = readNumberPayload(values);
  if (numbers.length > 0) {
    payload.numbers = numbers;
  }

  if (values.arcs.length > 0) {
    payload.arcs = values.arcs.map((entry) => ({ title: readTextValue(entry.title) }));
  }

  if (values.individuals.length > 0) {
    payload.individuals = values.individuals.map((entry) => {
      const normalizedIndividual = stripItem(entry);
      normalizedIndividual.role = undefined;
      return normalizedIndividual;
    });
  }

  if (values.appearances.length > 0) {
    payload.appearances = values.appearances.map((entry) => ({
      name: readTextValue(entry.name),
    }));
  }

  if (values.realities.length > 0) {
    payload.realities = values.realities.map((entry) => ({
      name: readTextValue(entry.name),
    }));
  }

  applyNegatableFlag(
    payload,
    values.firstPrint,
    values.notFirstPrint,
    "firstPrint",
    "notFirstPrint"
  );
  applyNegatableFlag(payload, values.onlyPrint, values.notOnlyPrint, "onlyPrint", "notOnlyPrint");
  applyNegatableFlag(payload, values.onlyTb, values.notOnlyTb, "onlyTb", "notOnlyTb");
  applyNegatableFlag(payload, values.exclusive, values.notExclusive, "exclusive", "notExclusive");
  applyNegatableFlag(payload, values.reprint, values.notReprint, "reprint", "notReprint");
  applyNegatableFlag(
    payload,
    values.otherOnlyTb,
    values.notOtherOnlyTb,
    "otherOnlyTb",
    "notOtherOnlyTb"
  );
  applyNegatableFlag(payload, values.noPrint, values.notNoPrint, "noPrint", "notNoPrint");
  applyNegatableFlag(
    payload,
    values.onlyOnePrint,
    values.notOnlyOnePrint,
    "onlyOnePrint",
    "notOnlyOnePrint"
  );
  applyCollectionFlags(payload, values);
  if (values.noComicguideId) payload.noComicguideId = true;
  if (values.noContent) payload.noContent = true;

  if (!hasPayload(payload)) {
    return null;
  }

  return {
    ...payload,
    us,
  };
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
