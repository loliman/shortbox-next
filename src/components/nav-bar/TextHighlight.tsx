"use client";

import React from "react";
import Box from "@mui/material/Box";

type TextHighlightProps = {
  text: string;
  search: string;
};

export const TextHighlight = React.memo(function TextHighlight({ text, search }: TextHighlightProps) {
  if (!search.trim()) {
    return <>{text}</>;
  }

  const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedSearch})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = regex.test(part);
        regex.lastIndex = 0; // Reset regex state after test
        
        return isMatch ? (
          <Box
            key={index}
            component="span"
            sx={{
              backgroundColor: "rgba(25, 118, 210, 0.16)", // Soft translucent primary blue
              color: "primary.main",
              borderRadius: "2px",
              px: "1px",
              fontWeight: 600,
              display: "inline-block",
            }}
          >
            {part}
          </Box>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </>
  );
});
