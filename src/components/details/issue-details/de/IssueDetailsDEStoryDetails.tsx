"use client";

import React from "react";
import Box from "@mui/material/Box";
import { StoryArcChips } from "../StoryArcChips";
import { StoryPeopleSection } from "../sections/StoryPeopleSection";
import { StoryAppearanceSection } from "../sections/StoryAppearanceSection";

interface IssueDetailsDEStoryDetailsProps {
  item?: {
    parent?: {
      issue?: {
        arcs?: Array<{ title?: string | null; type?: string | null } | null>;
      };
    };
  };
  us?: boolean;
  [key: string]: unknown;
}

type StoryDetailItem = Record<string, unknown>;

export function IssueDetailsDEStoryDetails(props: Readonly<IssueDetailsDEStoryDetailsProps>) {
  const storyArcs = Array.isArray(props.item?.parent?.issue?.arcs)
    ? props.item.parent.issue.arcs.filter(
        (arc): arc is { title?: string | null; type?: string | null } =>
          Boolean(arc && typeof arc === "object")
      )
    : [];
  const item: StoryDetailItem = props.item ?? {};
  return (
    <React.Fragment>
      {storyArcs.length > 0 ? (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            columnGap: 1,
            rowGap: 1,
            mb: 3,
          }}
        >
          <StoryArcChips arcs={storyArcs} us={props.us} inline />
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          rowGap: 3,
        }}
      >
        <Box
          sx={(theme) => ({
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            backgroundColor: "rgba(0,0,0,0.02)",
            ...theme.applyStyles("dark", {
              backgroundColor: "rgba(255,255,255,0.02)",
            }),
          })}
        >
          <StoryPeopleSection item={item} us={props.us} />
          <StoryAppearanceSection item={item} us={props.us} />
        </Box>
      </Box>
    </React.Fragment>
  );
}
