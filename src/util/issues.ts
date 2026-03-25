import { romanize } from "./util";
import { generateLabel } from "./hierarchy";
import type { SelectedRoot } from "../types/domain";

type ItemTitleIssueLike = {
  number?: string | number;
  stories?: unknown[];
  series?: unknown;
  format?: string;
  variant?: string;
};

type ItemTitleParentLike = {
  issue?: ItemTitleIssueLike;
  number?: number;
  format?: string;
  variant?: string;
};

type ItemTitleLike = {
  __typename?: string;
  title?: string;
  number?: string | number;
  parent?: ItemTitleParentLike;
  series?: unknown;
  format?: string;
  variant?: string;
};

export function generateItemTitle(item: ItemTitleLike, us: boolean) {
  let titleFromStory = "";
  if (item.title) titleFromStory = " - " + item.title;

  if (item.parent?.issue) {
    let title =
      generateLabel({ series: item.parent.issue.series } as unknown as SelectedRoot) +
      " #" +
      String(item.parent.issue.number || "");
    title +=
      item.__typename !== "Cover" &&
      (item.parent.number || 0) > 0 &&
      (item.parent.issue.stories?.length || 0) > 1
        ? " [" + romanize(item.parent.number) + "]"
        : "";
    title += item.parent.variant ? " [" + item.parent.format + "/" + item.parent.variant + "]" : "";
    return title + titleFromStory;
  } else if (item.series) {
    return generateLabel({ series: item.series } as unknown as SelectedRoot) + " #" + item.number;
  }
  else if (titleFromStory === "") {
    return us ? "Untitled" : "Exklusiv hier erschienen";
  } else {
    return titleFromStory.substring(3);
  }
}

export function generateIssueSubHeader(item: { title?: string; format?: string; variant?: string }) {
  let header = "";

  if (item.title) header += item.title;

  if (item.format) {
    header += " " + item.format;
    if (item.variant) header += " (" + item.variant + " Variant)";
  }
  return header;
}
