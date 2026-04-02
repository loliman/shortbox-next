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
import type { StoryIssue } from "./utils/storyIssueUtils";
import { getIssueLabel, getIssueUrl, getSeriesLabel } from "../../../util/issuePresentation";
import { IssueReferenceInline } from "../../generic/IssueNumberInline";
import { buildRouteHref } from "../../generic/routeHref";
import { usePendingNavigation } from "../../generic/usePendingNavigation";

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
  const publisherTitle = props.issue?.series?.publisher?.name || "";
  const routeUs = Boolean(props.routeUs);
  const coverUs = props.coverUs === undefined ? routeUs : props.coverUs;

  return (
    <ListItem
      className="row"
      divider={props.divider}
      sx={{ px: 0, py: 1.25, alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}
      onClick={() =>
        push(
          buildRouteHref(getIssueUrl(props.issue, routeUs), null, {
            expand: props.number,
            filter: null,
          })
        )
      }
    >
      <Box sx={{ minWidth: 0 }}>
        <Box>
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
                color: "#4b5565",
              }}
            >
              <IssueReferenceInline
                seriesLabel={getSeriesLabel(props.issue.series)}
                number={props.issue.number}
                legacy_number={props.issue.legacy_number}
              />
              {props.titleSuffix ? <Box component="span">{props.titleSuffix}</Box> : null}
            </Typography>

            {props.parentLink ? (
              <CoverTooltip
                issue={props.parentLink.issue}
                us={Boolean(props.parentLink.coverUs)}
                number={props.parentLink.number}
              >
                <Link
                  component={NextLink}
                  underline="hover"
                  color="text.secondary"
                  href={buildRouteHref(
                    getIssueUrl(props.parentLink?.issue, Boolean(props.parentLink?.routeUs)),
                    null,
                    {
                      expand: props.parentLink?.number,
                      filter: null,
                    }
                  )}
                  sx={{
                    p: 0,
                    textAlign: "right",
                    fontSize: "0.8rem",
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {(props.parentLink.prefix || "als") + " "}
                  <Box
                    component="span"
                    sx={{
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                      color: "inherit",
                    }}
                  >
                    {getIssueLabel(props.parentLink.issue)}
                  </Box>
                </Link>
              </CoverTooltip>
            ) : null}
          </Box>

          {props.subtitle || publisherTitle ? (
            <Typography
              sx={{
                fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: "0.92rem",
                lineHeight: 1.5,
                fontWeight: 500,
                color: "text.secondary",
                opacity: 0.9,
              }}
            >
              {props.subtitle || null}
              {props.subtitle && publisherTitle ? " · " : null}
              {publisherTitle || null}
            </Typography>
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
                buildRouteHref(getIssueUrl(props.issue, routeUs), null, {
                  expand: props.number,
                  filter: null,
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
