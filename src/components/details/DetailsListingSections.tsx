import React from "react";
import Box from "@mui/material/Box";
import CardHeader from "@mui/material/CardHeader";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import IssuePreview, { IssuePreviewPlaceholder } from "../issue-preview/IssuePreview";
import IssuePreviewSmall, {
  IssuePreviewPlaceholderSmall,
} from "../issue-preview/IssuePreviewSmall";
import LoadingDots from "../generic/LoadingDots";
import type { PreviewIssue } from "../issue-preview/utils/issuePreviewUtils";
import { getListingView, type ListingQuery } from "../../util/listingQuery";
import ListingToolbar from "../listing/ListingToolbar";

const GALLERY_GRID_SX = {
  display: "grid",
  columnGap: 3,
  rowGap: 1.5,
} as const;

type QueryState =
  | { filter?: string | null; order?: string | null; direction?: string | null; view?: string | null }
  | null
  | undefined;

type IssueHistoryListProps = {
  issues?: PreviewIssue[] | null;
  query?: QueryState;
  compactLayout?: boolean;
  loadingMore?: boolean;
  previewProps?: Record<string, unknown>;
  showSort?: boolean;
};

export function IssueHistoryList(props: Readonly<IssueHistoryListProps>) {
  const issues = props.issues || [];
  const showSort = props.showSort ?? true;
  const compactLayout = Boolean(props.compactLayout);
  const listingView = getListingView(props.query as ListingQuery);
  const previewProps = (props.previewProps || {}) as Record<string, unknown>;
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
    <Box component="section">
      <ListingToolbar
        query={props.query as ListingQuery}
        previewProps={previewProps}
        compactLayout={compactLayout}
        showSort={showSort}
      />
      <Box
        key={listingView}
        sx={{
          mt: 2,
          animation: "listingViewSwap 220ms ease-in-out",
          "@keyframes listingViewSwap": {
            "0%": { opacity: 0, transform: "translateY(4px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {listingView === "gallery" ? (
          <Box sx={galleryGridSx}>
            {issues.map((issue, idx) => (
              <IssuePreviewSmall
                {...props.previewProps}
                key={buildIssueKey(issue, idx)}
                issue={issue}
              />
            ))}
          </Box>
        ) : (
          <Stack spacing={1}>
            {issues.map((issue, idx) => (
              <IssuePreview
                {...props.previewProps}
                key={buildIssueKey(issue, idx)}
                issue={issue}
              />
            ))}
          </Stack>
        )}
      </Box>
      {props.loadingMore ? <LoadingDots /> : null}
    </Box>
  );
}

export function IssueHistoryPlaceholder(
  props: Readonly<{ query?: QueryState; compactLayout?: boolean }>
) {
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
    <Box component="section">
      <CardHeader title={<Skeleton variant="text" width={120} height={30} />} />
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
        <Stack spacing={1}>
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
    </Box>
  );
}

function buildIssueKey(issue: PreviewIssue, idx: number): string {
  if (issue.id) return String(issue.id);

  const publisher = issue.series?.publisher?.name || "";
  const series = issue.series?.title || "";
  const volume = issue.series?.volume || "";
  const number = issue.number || "";
  const format = issue.format || "";
  const variant = issue.variant || "";

  if (publisher && series && number) {
    return ["issue", publisher, series, volume, number, format, variant].join("|");
  }

  return "issue|" + idx;
}
