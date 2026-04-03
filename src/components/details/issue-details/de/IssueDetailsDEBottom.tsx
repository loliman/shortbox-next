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

interface IssueDetailsDEBottomProps {
  issue?: {
    id?: string | number | null;
    storyOwnerId?: string | number | null;
    comicguideid?: string | number | null;
    series?: Record<string, unknown>;
    number?: string | number;
  };
  [key: string]: unknown;
}

export async function IssueDetailsDEBottom(props: Readonly<IssueDetailsDEBottomProps>) {
  const issue = props.issue ?? {};
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
      <Contains
        {...props}
        header=""
        noEntriesHint="Dieser Ausgabe sind noch keine Geschichten zugeordnet"
        items={stories}
        itemTitle={ContainsTitleDetailed}
        itemNavigation={ContainsTitleDetailedNavigation}
        itemDetails={IssueDetailsDEStoryDetails}
      />
    </Box>
  );
}
