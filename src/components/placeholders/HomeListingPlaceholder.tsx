"use client";

import React from "react";
import Box from "@mui/material/Box";
import CardHeader from "@mui/material/CardHeader";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const effectiveQuery = React.useMemo<ListingQuery>(() => {
    if (props.query) return props.query;

    return {
      filter: searchParams.get("filter"),
      order: searchParams.get("order"),
      direction: searchParams.get("direction"),
      view: searchParams.get("view"),
    };
  }, [props.query, searchParams]);
  const listingView = getListingView(effectiveQuery);
  const hasFilter = Boolean(effectiveQuery?.filter);
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
        <CardHeader
          sx={{
            px: 0,
            py: 0,
            "& .MuiCardHeader-content": {
              minWidth: 0,
            },
            "& .MuiCardHeader-action": {
              m: 0,
              alignSelf: "center",
              display: { xs: "none", md: "flex" },
            },
          }}
          title={<Skeleton variant="text" width={260} height={34} />}
          subheader={<Skeleton variant="text" width={220} height={24} />}
          action={<Skeleton variant="rounded" width={148} height={40} />}
        />
      </Box>

      {!compactLayout && hasFilter ? (
        <Stack spacing={1.5} sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <Skeleton variant="rounded" width={148} height={40} />
          </Box>
          <Skeleton variant="rounded" width="100%" height={44} />
        </Stack>
      ) : null}

      {compactLayout ? (
        <Stack spacing={1.5} sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", justifyContent: "stretch", width: "100%" }}>
            <Skeleton variant="rounded" width="100%" height={40} />
          </Box>
          {hasFilter ? <Skeleton variant="rounded" width="100%" height={44} /> : null}
        </Stack>
      ) : null}

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
