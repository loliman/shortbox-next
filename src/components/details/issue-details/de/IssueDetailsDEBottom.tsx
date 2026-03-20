import React from "react";
import Box from "@mui/material/Box";
import { Contains, ContainsTitleDetailed } from "../../IssueDetails";
import { IssueDetailsDEStoryDetails } from "./IssueDetailsDEStoryDetails";
import type { ItemLike } from "../contains/expanded";

interface IssueDetailsDEBottomProps {
  issue?: {
    stories?: unknown[];
    comicguideid?: string | number | null;
    series?: Record<string, unknown>;
    number?: string | number;
  };
  [key: string]: any;
}

export function IssueDetailsDEBottom(props: Readonly<IssueDetailsDEBottomProps>) {
  const issue = props.issue || {};
  const stories = Array.isArray(issue.stories)
    ? issue.stories.filter((item): item is ItemLike => Boolean(item && typeof item === "object"))
    : [];

  return (
    <Box sx={{ mt: 0 }}>
      <Contains
        {...props}
        header=""
        noEntriesHint="Dieser Ausgabe sind noch keine Geschichten zugeordnet"
        items={stories}
        itemTitle={<ContainsTitleDetailed {...(props as any)} />}
        itemDetails={<IssueDetailsDEStoryDetails />}
      />
    </Box>
  );
}
