import type { Issue, Publisher, SelectedRoot, Series } from "../types/domain";

type TypedEntity = Publisher | Series | Issue;
type MutableRecord = Record<string, unknown> & {
  __resolveType?: unknown;
  __typename?: unknown;
  id?: unknown;
  series?: MutableRecord & { publisher?: MutableRecord };
  publisher?: MutableRecord;
};

export function wrapItem(item: TypedEntity): SelectedRoot {
  if (item.__typename === "Publisher") return { us: item.us ? item.us : false, publisher: item };

  if (item.__typename === "Series")
    return { us: item.publisher?.us ? item.publisher.us : false, series: item };

  const issue = item as Issue;
  return { us: issue.series?.publisher?.us ? issue.series.publisher.us : false, issue };
}

export function unwrapItem(item: SelectedRoot & { __typename?: string }) {
  if (item.__typename === "Publisher") return item.publisher;

  if (item.__typename === "Series") return item.series;

  return item.issue;
}

export function stripItem<T extends object>(item: T): T {
  const stripped = structuredClone(item) as MutableRecord;

  stripped.__resolveType = undefined;
  stripped.__typename = undefined;

  if (stripped.series) {
    stripped.series.id = undefined;
    stripped.series.__resolveType = undefined;
    stripped.series.__typename = undefined;
    if (stripped.series.publisher) {
      stripped.series.publisher.id = undefined;
      stripped.series.publisher.__resolveType = undefined;
      stripped.series.publisher.__typename = undefined;
    }
  }

  if (stripped.publisher) {
    stripped.publisher.id = undefined;
    stripped.publisher.__typename = undefined;
    stripped.publisher.__resolveType = undefined;
  }

  return stripped as T;
}

export function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function decapitalize(string: string): string {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

export function romanize(num: string | number): string | number {
  if (Number.isNaN(num)) return Number.NaN;

  const digits = String(+num).split(""),
    key = [
      "",
      "C",
      "CC",
      "CCC",
      "CD",
      "D",
      "DC",
      "DCC",
      "DCCC",
      "CM",
      "",
      "X",
      "XX",
      "XXX",
      "XL",
      "L",
      "LX",
      "LXX",
      "LXXX",
      "XC",
      "",
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
    ],
    romanStart = "";
  let roman = romanStart;
  let i = 3;

  while (i--) {
    const digit = digits.pop() ?? "0";
    roman = (key[+digit + i * 10] || "") + roman;
  }
  return new Array(+digits.join("") + 1).join("M") + roman;
}

export function today() {
  const date = new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0"); // January is 0!
  const yyyy = String(date.getFullYear());

  return dd + "." + mm + "." + yyyy;
}
