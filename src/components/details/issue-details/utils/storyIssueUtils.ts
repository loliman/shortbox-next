export type StoryIssue = {
  number?: string | number;
  legacy_number?: string | null;
  title?: string | null;
  format?: string | null;
  variant?: string | null;
  collected?: boolean;
  verified?: boolean;
  comicguideid?: string | number | null;
  cover?: {
    url?: string | null;
  } | null;
  series?: {
    title?: string;
    volume?: number;
    publisher?: { name?: string; us?: boolean };
  };
};

export type StoryIssueRelation = {
  issue?: StoryIssue;
  number?: string | number;
  part?: string | null;
  addinfo?: string | null;
  parent?: {
    issue?: StoryIssue;
    number?: string | number;
  } | null;
};

export function toChildAddinfo(child: StoryIssueRelation): string {
  let addinfoText = "";
  if (child.part && child.part.indexOf("/x") === -1) {
    addinfoText += "Teil " + child.part.replace("/", " von ");
  }
  if (addinfoText !== "" && child.addinfo) {
    addinfoText += ", ";
  }
  if (child.addinfo) {
    addinfoText += child.addinfo;
  }
  return addinfoText;
}

export function isSameIssue(issueA?: StoryIssue | null, issueB?: StoryIssue | null): boolean {
  if (!issueA || !issueB || !issueA.series || !issueB.series) return false;

  return (
    normalizeText(issueA.series.publisher?.name) === normalizeText(issueB.series.publisher?.name) &&
    normalizeText(issueA.series.title) === normalizeText(issueB.series.title) &&
    readTextValue(issueA.series.volume) === readTextValue(issueB.series.volume) &&
    readTextValue(issueA.number) === readTextValue(issueB.number)
  );
}

function normalizeText(value: unknown): string {
  return readTextValue(value).toLowerCase();
}

export function toIssueRowKey(item: StoryIssueRelation, idx: number): string {
  const issue = item?.issue;
  const series = issue?.series;
  const publisher = readTextValue(series?.publisher?.name) || "publisher";
  const title = readTextValue(series?.title) || "series";
  const issueNumber = readTextValue(issue?.number) || readTextValue(item?.number) || String(idx);
  const relationNumber = readTextValue(item?.number) || String(idx);
  return `${publisher}|${title}|${issueNumber}|${relationNumber}`;
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
