import React from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Skeleton from "@mui/material/Skeleton";
import { IssueHistoryPlaceholder } from "../details/DetailsListingSections";

type QueryState = { filter?: string | null } | null | undefined;

type DetailsPagePlaceholderProps = {
  query?: QueryState;
  compactLayout?: boolean;
  titleWidth?: string | number;
  subheaderWidth?: string | number;
};

export function DetailsPagePlaceholder(props: Readonly<DetailsPagePlaceholderProps>) {
  return (
    <React.Fragment>
      <CardHeader
        title={
          <Box sx={{ width: "100%" }}>
            <Skeleton variant="text" width={props.titleWidth || "45%"} height={34} />
            <Skeleton variant="text" width={props.subheaderWidth || "30%"} height={24} />
          </Box>
        }
      />

      <CardContent sx={{ pt: 1 }}>
        <IssueHistoryPlaceholder query={props.query} compactLayout={props.compactLayout} />
      </CardContent>
    </React.Fragment>
  );
}
