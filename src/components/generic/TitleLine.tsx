import React from "react";
import Box from "@mui/material/Box";

interface TitleLineProps {
  title: React.ReactNode;
  session?: unknown;
  id?: string | number;
}

export default function TitleLine(props: Readonly<TitleLineProps>) {
  const showId = Boolean(props.session) && props.id !== undefined && props.id !== null;

  return (
    <Box
      component="span"
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Box component="span" sx={{ flexGrow: 1, minWidth: 0 }}>
        {props.title}
      </Box>

      {showId ? (
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            alignSelf: "center",
            color: "text.secondary",
            fontSize: "0.75rem",
            fontWeight: 500,
            opacity: 0.8,
            whiteSpace: "nowrap",
            lineHeight: 1,
            pr: 1.5,
          }}
        >
          #{props.id}
        </Box>
      ) : null}
    </Box>
  );
}
