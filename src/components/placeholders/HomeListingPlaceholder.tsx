import React from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { IssuePreviewPlaceholder } from "../issue-preview/IssuePreview";
import { IssuePreviewPlaceholderSmall } from "../issue-preview/IssuePreviewSmall";
import { getListingView, type ListingQuery } from "../../util/listingQuery";

const GALLERY_GRID_SX = {
  display: "grid",
  columnGap: 3,
  rowGap: 1.5,
} as const;

type HomeListingPlaceholderProps = {
  query?: ListingQuery | null;
  compactLayout?: boolean;
};

export function HomeListingPlaceholder(props: Readonly<HomeListingPlaceholderProps>) {
  const compactLayout = Boolean(props.compactLayout);
  const listingView = getListingView(props.query as ListingQuery);
  const galleryGridColumns = compactLayout
    ? "repeat(1, minmax(0, 1fr))"
    : {
        xs: "repeat(1, minmax(0, 1fr))",
        sm: "repeat(2, minmax(0, 1fr))",
        md: "repeat(3, minmax(0, 1fr))",
        lg: "repeat(4, minmax(0, 1fr))",
        xl: "repeat(5, minmax(0, 1fr))",
      };
  const galleryGridSx = {
    ...GALLERY_GRID_SX,
    gridTemplateColumns: galleryGridColumns,
  } as const;

  return (
    <Stack spacing={2.5} sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Box>
        <Skeleton variant="text" width={240} height={34} />
        <Skeleton variant="text" width={300} />
      </Box>

      {listingView === "gallery" ? (
        <Box sx={galleryGridSx}>
          <IssuePreviewPlaceholderSmall idx={0} />
          <IssuePreviewPlaceholderSmall idx={1} />
          <IssuePreviewPlaceholderSmall idx={2} />
          <IssuePreviewPlaceholderSmall idx={3} />
          <IssuePreviewPlaceholderSmall idx={4} />
          <IssuePreviewPlaceholderSmall idx={5} />
          <IssuePreviewPlaceholderSmall idx={6} />
          <IssuePreviewPlaceholderSmall idx={7} />
          <IssuePreviewPlaceholderSmall idx={8} />
          <IssuePreviewPlaceholderSmall idx={9} />
        </Box>
      ) : (
        <Stack spacing={1.5}>
          <IssuePreviewPlaceholder />
          <IssuePreviewPlaceholder />
          <IssuePreviewPlaceholder />
          <IssuePreviewPlaceholder />
          <IssuePreviewPlaceholder />
          <IssuePreviewPlaceholder />
          <IssuePreviewPlaceholder />
          <IssuePreviewPlaceholder />
          <IssuePreviewPlaceholder />
          <IssuePreviewPlaceholder />
        </Stack>
      )}
    </Stack>
  );
}
