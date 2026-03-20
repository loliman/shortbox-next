import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";

export function IssueDetailsStoryPreview(props: { idx: number }) {
  const widths = ["78%", "62%", "70%", "54%"] as const;
  const width = widths[props.idx % widths.length];

  return (
    <Accordion>
      <AccordionSummary>
        <Box sx={{ width: "100%" }}>
          <Skeleton variant="text" width={width} />
        </Box>
      </AccordionSummary>
    </Accordion>
  );
}
