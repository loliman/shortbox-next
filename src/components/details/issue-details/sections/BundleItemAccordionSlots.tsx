"use client";

import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter } from "next/navigation";
import { buildDetailPageUrl } from "../../../../lib/url-builder";
import { getPreferredCoverUrl } from "../../../generic/coverUrl";

export interface BundleItem {
  id: string;
  fkBundleVariant?: string | null;
  versionLabel?: string;
  position: number;
  rawTitle?: string;
  addInfo?: string;
  addinfo?: string;
  containedIssue?: {
    id: string;
    number: string;
    title: string;
    series?: {
      id?: string;
      title: string | null;
      volume: number | null;
      startyear?: number | null;
      publisher?: {
        name: string | null;
        us?: boolean;
      } | null;
    } | null;
    format?: string | null;
    variant?: string | null;
    stories?: Array<{
      id: string;
      number: number;
      title: string;
      part?: string;
      addinfo?: string;
      parent?: {
        id: string;
        number: number;
        title: string;
        issue?: {
          id: string;
          number: string;
          series?: {
            title: string | null;
            volume: number | null;
            startyear?: number | null;
            publisher?: {
              name: string | null;
              us?: boolean;
            } | null;
          } | null;
          format?: string | null;
          variant?: string | null;
        } | null;
      } | null;
    }>;
  } | null;
}

export function BundleItemTitle({ item }: { item: BundleItem }) {
  const contained = item.containedIssue;
  const positionLabel = `Heft #${item.position}`;

  let titleText = item.rawTitle || "Unbekanntes Heft";
  if (contained) {
    const seriesTitle = contained.series?.title || "Heft";
    const volStr = contained.series?.volume ? ` (Vol. ${contained.series.volume})` : "";
    titleText = `${seriesTitle}${volStr} #${contained.number}`;
  }

  return (
    <Box sx={{ display: "grid", rowGap: 0.3 }}>
      <Typography
        variant="overline"
        sx={{
          fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
          fontWeight: 600,
          fontSize: "0.7rem",
          lineHeight: 1.5,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "primary.main",
        }}
      >
        {positionLabel}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{
          fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: "1rem",
          lineHeight: 1.4,
          fontWeight: 700,
          color: "text.primary",
        }}
      >
        {titleText}
      </Typography>
      {item.addInfo ? (
        <Typography variant="body2" color="text.secondary">
          {item.addInfo}
        </Typography>
      ) : null}
    </Box>
  );
}

export function BundleItemNavigation({ item }: { item: BundleItem }) {
  const router = useRouter();
  const contained = item.containedIssue;

  if (!contained) return null;

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildDetailPageUrl({
      locale: "de",
      publisherName: contained.series?.publisher?.name,
      seriesTitle: contained.series?.title,
      seriesYear: contained.series?.startyear,
      seriesVolume: contained.series?.volume,
      issueNumber: contained.number,
      format: contained.format,
      variant: contained.variant,
    });
    router.push(url);
  };

  return (
    <IconButton
      size="small"
      onClick={handleNavigate}
      aria-label="Zum Heft navigieren"
      sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
    >
      <SearchIcon fontSize="small" />
    </IconButton>
  );
}

export function BundleItemDetails({ item }: { item: BundleItem }) {
  const router = useRouter();
  const contained = item.containedIssue;
  const fallbackUrl = "/nocover_simple.png";
  const coverUrl = contained ? getPreferredCoverUrl(contained) : fallbackUrl;

  return (
    <Grid container spacing={3} sx={{ pt: 1 }}>
      {/* Cover Column */}
      <Grid size={{ xs: 12, sm: 3, md: 2 }}>
        <Box
          component="img"
          src={coverUrl || fallbackUrl}
          alt={contained ? contained.title : "Heft Cover"}
          sx={(theme) => ({
            width: "100%",
            aspectRatio: "2/3",
            objectFit: "cover",
            borderRadius: "6px",
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[1],
          })}
        />
      </Grid>

      {/* Stories/Metadata Column */}
      <Grid size={{ xs: 12, sm: 9, md: 10 }}>
        {contained ? (
          <Stack spacing={2}>
            {contained.stories && contained.stories.length > 0 ? (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, mb: 1, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em", color: "text.secondary" }}
                >
                  Enthaltene Geschichten ({contained.stories.length})
                </Typography>
                <Stack spacing={1}>
                  {contained.stories.map((story) => (
                    <Box
                      key={story.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        py: 0.5,
                        borderBottom: "1px dashed",
                        borderColor: "action.hover",
                        "&:last-child": { borderBottom: "none" },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", minWidth: 20 }}>
                        #{story.number}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary", flex: 1 }}>
                        {story.title || "Ohne Titel"}
                        {story.part ? ` (Teil ${story.part})` : ""}
                        {story.addinfo ? (
                          <Box component="span" sx={{ fontStyle: "italic", ml: 1, color: "text.secondary", fontWeight: 400 }}>
                            · {story.addinfo}
                          </Box>
                        ) : null}
                      </Typography>
                      {story.parent?.issue ? (
                        <IconButton
                          size="small"
                          aria-label="Zur US-Originalausgabe navigieren"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = buildDetailPageUrl({
                              locale: "us",
                              publisherName: story.parent?.issue?.series?.publisher?.name,
                              seriesTitle: story.parent?.issue?.series?.title,
                              seriesYear: story.parent?.issue?.series?.startyear,
                              seriesVolume: story.parent?.issue?.series?.volume,
                              issueNumber: story.parent?.issue?.number,
                              format: story.parent?.issue?.format,
                              variant: story.parent?.issue?.variant,
                            });
                            router.push(url);
                          }}
                          sx={{ p: 0.25, ml: 1, color: "text.secondary", "&:hover": { color: "primary.main" } }}
                        >
                          <SearchIcon sx={{ fontSize: "16px" }} />
                        </IconButton>
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                Diesem Heft sind im Katalog noch keine Geschichten zugeordnet.
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
            Dieses Heft ist momentan nur als Text-Eintrag ohne Verknüpfung zur Katalog-Datenbank hinterlegt.
          </Typography>
        )}
      </Grid>
    </Grid>
  );
}