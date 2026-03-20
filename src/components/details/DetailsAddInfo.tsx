import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { sanitizeHtml } from "../../util/sanitizeHtml";

type DetailsAddInfoProps = {
  addinfo?: string | null;
};

export function DetailsAddInfo(props: Readonly<DetailsAddInfoProps>) {
  if (!props.addinfo) return null;

  return (
    <Box sx={{ mt: 1, mb: 3 }}>
      <Typography
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(props.addinfo),
        }}
      />
    </Box>
  );
}
