import React from "react";
import Box from "@mui/material/Box";
import { Contains } from "../contains/Contains";
import {
  ContainsTitleDetailed,
  ContainsTitleDetailedNavigation,
} from "../contains/ContainsTitleDetailed";
import { IssueDetailsDEStoryDetails } from "./IssueDetailsDEStoryDetails";
import type { ItemLike } from "../contains/expanded";
import { readIssueDetailStories } from "@/src/lib/read/issue-details-read";

import type { BundleItem } from "../sections/IssueBundleSection";
import {
  BundleItemTitle,
  BundleItemNavigation,
  BundleItemDetails,
} from "../sections/BundleItemAccordionSlots";

interface IssueDetailsDEBottomProps {
  issue?: IssueDetailsDeBottomIssue;
  us?: boolean;
  [key: string]: unknown;
}

type IssueDetailsDeBottomIssue = {
  id?: string | number | null;
  variantId?: string | number | null;
  storyOwnerId?: string | number | null;
  comicguideid?: string | number | null;
  series?: Record<string, unknown>;
  number?: string | number;
  bundleItems?: BundleItem[];
  variant?: string;
};

export async function IssueDetailsDEBottom(props: Readonly<IssueDetailsDEBottomProps>) {
  const issue = props.issue ?? {};
  const activeVariantId = issue.variantId ? String(issue.variantId) : null;
  const activeVariantLabel = issue.variant || "";

  const rawBundleItems = issue.bundleItems ?? [];
  const bundleItems = rawBundleItems.filter((item: any) => {
    if (item.fkBundleVariant && activeVariantId) {
      return item.fkBundleVariant === activeVariantId;
    }
    return (item.versionLabel || "") === activeVariantLabel;
  });

  const hasBundleItems = bundleItems.length > 0;

  const rawStories =
    issue.id && issue.storyOwnerId
      ? await readIssueDetailStories({
          selectedIssueId: issue.id,
          storyOwnerId: issue.storyOwnerId,
        })
      : [];
  const stories = rawStories.filter((item) => Boolean(item && typeof item === "object")) as ItemLike[];

  return (
    <Box sx={{ mt: 0 }}>
      {hasBundleItems ? (
        <Box sx={{ mb: 4 }}>
          <Contains
            {...props}
            header="Enthaltene Originalausgaben"
            noEntriesHint="Keine Ausgaben zugeordnet"
            items={bundleItems}
            itemTitle={BundleItemTitle}
            itemNavigation={BundleItemNavigation}
            itemDetails={BundleItemDetails}
          />
        </Box>
      ) : null}

      {stories.length > 0 || !hasBundleItems ? (
        <Contains
          {...props}
          header=""
          noEntriesHint="Dieser Ausgabe sind noch keine Geschichten zugeordnet"
          items={stories}
          itemTitle={ContainsTitleDetailed}
          itemNavigation={ContainsTitleDetailedNavigation}
          itemDetails={IssueDetailsDEStoryDetails}
        />
      ) : null}
    </Box>
  );
}
