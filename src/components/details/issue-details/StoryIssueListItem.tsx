"use client";

import React from "react";
import NextLink from "next/link";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import SearchIcon from "@mui/icons-material/Search";
import CoverTooltip from "../../nav-bar/CoverTooltip";
import { romanize } from "../../../util/util";
import type { StoryIssue } from "./utils/storyIssueUtils";
import { getIssueLabel, getIssueUrl, getSeriesLabel } from "../../../lib/routes/issue-presentation";
import { IssueReferenceInline } from "../../generic/IssueNumberInline";
import { buildRouteHref } from "../../generic/routeHref";
import { usePendingNavigation } from "../../generic/usePendingNavigation";
import { useSearchParams } from "next/navigation";

type ParentLink = {
  issue: StoryIssue;
  number?: string | number;
  prefix?: string;
  routeUs?: boolean;
  coverUs?: boolean;
};

type StoryIssueListItemProps = {
  issue: StoryIssue;
  number?: string | number;
  subtitle?: string | null;
  titleSuffix?: string;
  parentLink?: ParentLink | null;
  routeUs?: boolean;
  coverUs?: boolean;
  divider?: boolean;
  showCollected?: boolean;
  session?: unknown;
};

export function StoryIssueListItem(props: Readonly<StoryIssueListItemProps>) {
  const { push } = usePendingNavigation();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || null;
  const currentQuery = filter ? { filter } : null;
  const publisherTitle = props.issue?.series?.publisher?.name || "";
  const routeUs = Boolean(props.routeUs);
  const coverUs = props.coverUs ?? routeUs;

  return (
    <ListItem
      className="row"
      divider={props.divider}
      sx={{ px: 0, py: 1.25, alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}
      onClick={() =>
        push(
          buildRouteHref(getIssueUrl(props.issue, routeUs), currentQuery, {
            expand: props.number,
          })
        )
      }
    >
      <Box sx={{ minWidth: 0, overflow: "hidden" }}>
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 1,
              minWidth: 0,
            }}
          >
            <Typography
              noWrap
              sx={{
                fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                fontWeight: 700,
                fontSize: "0.98rem",
                lineHeight: 1.6,
                minWidth: 0,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "text.primary",
              }}
            >
              <IssueReferenceInline
                seriesLabel={getSeriesLabel(props.issue.series)}
                number={props.issue.number}
                legacy_number={props.issue.legacy_number}
              />
              {props.titleSuffix ? <Box component="span">{props.titleSuffix}</Box> : null}
            </Typography>
          </Box>

          {props.subtitle || publisherTitle ? (
            <Typography
              sx={{
                fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: "0.92rem",
                lineHeight: 1.5,
                fontWeight: 500,
                color: "text.secondary",
              }}
            >
              {props.subtitle || null}
              {props.subtitle && publisherTitle ? " · " : null}
              {publisherTitle || null}
            </Typography>
          ) : null}

          {props.parentLink ? (
            <Box sx={{ mt: 0.5 }}>
              <CoverTooltip
                issue={props.parentLink.issue}
                us={Boolean(props.parentLink.coverUs)}
                number={props.parentLink.number}
              >
                <Link
                  component={NextLink}
                  underline="none"
                  color="text.secondary"
                  href={buildRouteHref(
                    getIssueUrl(props.parentLink?.issue, Boolean(props.parentLink?.routeUs)),
                    currentQuery,
                    {
                      expand: props.parentLink?.number,
                    }
                  )}
                  sx={{
                    p: 0,
                    fontSize: "0.82rem",
                    lineHeight: 1.4,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                      color: "inherit",
                    }}
                  >
                    {(props.parentLink.prefix || "als") + " "}
                    {getIssueLabel(props.parentLink.issue)}
                    {(() => {
                      const storyNum = parseInt(String(props.parentLink.number), 10);
                      const sCount = props.parentLink.issue.storiesCount ?? 1;
                      return Number.isInteger(storyNum) && storyNum > 0 && sCount > 1
                        ? ` [${romanize(storyNum)}]`
                        : "";
                    })()}
                  </Box>
                </Link>
              </CoverTooltip>
            </Box>
          ) : null}

          {props.showCollected && props.issue.collected && props.session ? (
            <Box sx={{ mt: 0.75 }}>
              <Chip size="small" label="Gesammelt" color="success" />
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        <CoverTooltip issue={props.issue} us={coverUs} number={props.number}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              push(
                buildRouteHref(getIssueUrl(props.issue, routeUs), currentQuery, {
                  expand: props.number,
                })
              );
            }}
            aria-label="Details"
          >
            <SearchIcon fontSize="small" />
          </IconButton>
        </CoverTooltip>
      </Box>
    </ListItem>
  );
}
