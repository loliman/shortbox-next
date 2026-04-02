"use client";

import React from "react";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import { buildArcFilterUrl } from "@/src/lib/url-builder";
import { usePendingNavigation } from "../../generic/usePendingNavigation";

type ArcLike = {
  title?: string | null;
  type?: string | null;
};

type StoryArcChipsProps = {
  arcs?: ArcLike[];
  us?: boolean;
  inline?: boolean;
};

export function StoryArcChips(props: Readonly<StoryArcChipsProps>) {
  const { push } = usePendingNavigation();
  const arcs = (props.arcs || []).filter((arc) => Boolean(arc?.title));
  if (arcs.length === 0) return null;

  return (
    <Box
      sx={{
        mt: props.inline ? 0 : 1,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: 1 }}>
        {arcs.map((arc) => {
          const arcTitle = arc.title || "";
          const { color, type } = toArcMeta(arc.type || "");
          return (
            <Chip
              key={`${arc.type || "ARC"}|${arcTitle}`}
              variant="outlined"
              label={arcTitle + " (" + type + ")"}
              color={color}
              onClick={() =>
                push(
                  buildArcFilterUrl(props.us ? "us" : "de", arcTitle)
                )
              }
            />
          );
        })}
      </Box>
    </Box>
  );
}

function toArcMeta(type: string) {
  switch (type) {
    case "EVENT":
      return { color: "primary" as const, type: "Event" };
    case "STORYLINE":
      return { color: "secondary" as const, type: "Story Line" };
    default:
      return { color: "default" as const, type: "Story Arc" };
  }
}
