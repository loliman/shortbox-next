import React from "react";
import Box from "@mui/material/Box";
import { Contains } from "../contains/Contains";
import { ContainsTitleSimple } from "../contains/ContainsTitleSimple";
import { IssueDetailsUSStoryDetails } from "./IssueDetailsUSStoryDetails";
import type { ItemLike } from "../contains/expanded";

interface IssueDetailsUSBottomProps {
  issue?: {
    stories?: unknown[];
    series?: Record<string, unknown>;
    number?: string | number;
  };
  session?: unknown;
  [key: string]: any;
}

export function IssueDetailsUSBottom(props: Readonly<IssueDetailsUSBottomProps>) {
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
        itemTitle={ContainsTitleSimple}
        itemDetails={IssueDetailsUSStoryDetails}
      />
    </Box>
  );
}
