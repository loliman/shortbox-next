export type StoryIssue = {
  number?: string | number;
  legacy_number?: string | null;
  title?: string | null;
  collected?: boolean;
  verified?: boolean;
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

export function isSameIssue(issueA?: StoryIssue, issueB?: StoryIssue): boolean {
  if (!issueA || !issueB || !issueA.series || !issueB.series) return false;

  return (
    String(issueA.number) === String(issueB.number) &&
    issueA.series.title === issueB.series.title &&
    issueA.series.volume === issueB.series.volume
  );
}

export function toIssueRowKey(item: StoryIssueRelation, idx: number): string {
  const issue = item?.issue;
  const series = issue?.series;
  return `${series?.publisher?.name || "publisher"}|${series?.title || "series"}|${
    issue?.number || item?.number || idx
  }|${item?.number || idx}`;
}
