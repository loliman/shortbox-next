import React from "react";
import { notFound } from "next/navigation";
import QueryResult from "../generic/QueryResult";
import Box from "@mui/material/Box";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import SnackbarContent from "@mui/material/SnackbarContent";
import { generateIssueSubHeader } from "../../util/issues";
import { generateLabel } from "../../util/hierarchy";
import { isMockMode } from "../../app/mockMode";
import EditButton from "../restricted/EditButton";
import TitleLine from "../generic/TitleLine";
import { IssueReferenceInline } from "../generic/IssueNumberInline";
import type { Issue, SelectedRoot } from "../../types/domain";
import { sanitizeHtml } from "../../util/sanitizeHtml";
import { StoryArcChips } from "./issue-details/StoryArcChips";
import { IssueVariants } from "./issue-details/variants/IssueVariants";
import type { VariantIssue } from "./issue-details/variants/types";
import { IssueDetailsPreview } from "./issue-details/preview/IssueDetailsPreview";
import { DetailsTable } from "./issue-details/DetailsTable";
import type { PreviewIssue } from "../issue-preview/utils/issuePreviewUtils";
import { collectIssueArcs, getTodayLocalDate } from "./issue-details/utils/issueDetailsUtils";
import { generateComicGuideUrl, generateMarvelDbUrl } from "./issue-details/utils/externalLinks";
import { IssueCoverGalleryClient } from "./issue-details/IssueCoverGalleryClient";
import type { SessionData } from "../../app/session";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";

interface IssueDetailsProps {
  initialIssue?: unknown;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  session?: SessionData | null;
  subheader?: boolean;
  details?: React.ReactElement;
  bottom?: React.ReactElement;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
}

export default function IssueDetails(props: Readonly<IssueDetailsProps>) {
  const selected = props.selected;
  const us = Boolean(props.us);
  const details = props.details || <></>;
  const loadedIssue = (props.initialIssue as Issue | null | undefined) || null;
  const loading = false;
  const error = null;
  const issueForVariants = loadedIssue ? toIssueWithMockVariants(loadedIssue) : null;
  if (!loadedIssue || !issueForVariants) notFound();

  if (loading && !loadedIssue) {
    return (
      <Box className="data-fade">
        <QueryResult
          data={undefined}
          loading={true}
          selected={selected}
          placeholder={<IssueDetailsPreview />}
          placeholderCount={1}
        />
      </Box>
    );
  }

  if (error || !issueForVariants || !loadedIssue) {
    return (
      <Box className="data-fade">
        <QueryResult
          error={error}
          data={loadedIssue}
          loading={loading}
          selected={selected}
          placeholder={<IssueDetailsPreview />}
          placeholderCount={1}
        />
      </Box>
    );
  }

  const arcs = collectIssueArcs(issueForVariants, us);
  const today = getTodayLocalDate();
  const releaseDate = issueForVariants.releasedate ? new Date(issueForVariants.releasedate) : null;
  const coverGalleryIssues = buildCoverGalleryIssues(issueForVariants);
  const coverAttribution = !us && issueForVariants.comicguideid ? (
    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.82, textAlign: "left" }}>
      Das Cover für&nbsp;
      <a
        href={generateComicGuideUrl(issueForVariants as any)}
        rel="noopener noreferrer nofollow"
        target="_blank"
      >
        <IssueReferenceInline
          seriesLabel={generateLabel({ series: issueForVariants.series } as any)}
          number={issueForVariants.number}
          legacy_number={issueForVariants.legacy_number}
        />
      </a>
      &nbsp;wird bereitgestellt vom&nbsp;
      <a href="https://www.comicguide.de" rel="noopener noreferrer nofollow" target="_blank">
        deutschen ComicGuide
      </a>
      &nbsp;und darf nicht ohne Genehmigung weiterverbreitet werden.
    </Typography>
  ) : us ? (
    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.82, textAlign: "left" }}>
      Informationen über&nbsp;
      <a
        href={generateMarvelDbUrl(issueForVariants as any)}
        rel="noopener noreferrer nofollow"
        target="_blank"
      >
        <IssueReferenceInline
          seriesLabel={generateLabel({ series: issueForVariants.series } as any)}
          number={issueForVariants.number}
          legacy_number={issueForVariants.legacy_number}
        />
      </a>
      &nbsp;werden bezogen aus der&nbsp;
      <a href="https://marvel.fandom.com" rel="noopener noreferrer nofollow" target="_blank">
        Marvel Database
      </a>
      &nbsp;und stehen unter der&nbsp;
      <a
        href="https://creativecommons.org/licenses/by/3.0/de/"
        rel="noopener noreferrer nofollow"
        target="_blank"
      >
        Creative Commons License 3.0
      </a>
      &nbsp;. Die Informationen wurden aufbereitet und unter Umständen ergänzt.&nbsp;
    </Typography>
  ) : null;

  return (
    <Box className="data-fade" key={loadedIssue.id || "issue-details"} sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
        {!us && !loadedIssue.verified && releaseDate && today < releaseDate ? (
          <SnackbarContent
            id="notVerifiedWarning"
            message="Diese Ausgabe ist noch nicht im Handel erhältlich und noch nicht vorab verifiziert worden. Die angezeigten Informationen weichen gegebenenfalls von den tatsächlichen Daten ab."
            sx={{
              width: { xs: "calc(100% - 16px)", sm: "100%" },
              mx: "auto",
              borderRadius: { xs: 1, sm: 0 },
            }}
          />
        ) : null}

        <CardHeader
          title={
            <TitleLine
              title={
                <IssueReferenceInline
                  seriesLabel={generateLabel({ series: loadedIssue.series } as any)}
                  number={loadedIssue.number}
                  legacy_number={loadedIssue.legacy_number}
                />
              }
              id={loadedIssue.id ?? undefined}
              session={props.session}
            />
          }
          subheader={props.subheader ? generateIssueSubHeader(loadedIssue) : ""}
          action={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EditButton session={props.session} item={loadedIssue} level={props.level} us={props.us} />
            </Box>
          }
        />

        <CardContent sx={{ pt: 1 }}>
          {arcs.length > 0 ? (
            <Box sx={{ pb: 1.5, minWidth: 0, display: "flex", alignItems: "center", gap: 1, flexWrap: "nowrap", overflow: "hidden" }}>
              <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                <StoryArcChips arcs={arcs} us={us} inline />
              </Box>
            </Box>
          ) : null}

          <Box sx={{ pb: 5 }}>
            <IssueVariants
              us={us}
              issue={issueForVariants as unknown as VariantIssue}
              activeFormat={selected.issue?.format ?? undefined}
              activeVariant={selected.issue?.variant ?? undefined}
              session={props.session}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) clamp(320px, 36vw, 480px)" }, gap: 2, alignItems: "start", width: "100%" }}>
            <Box sx={{ minWidth: 0, width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
              <DetailsTable issue={issueForVariants} details={details} query={props.query} us={us} />

              {props.bottom ? (
                <Box sx={{ minWidth: 0, width: "100%", mt: 0 }}>
                  {React.cloneElement(props.bottom as React.ReactElement<any>, {
                    query: props.query,
                    selected: issueForVariants,
                    issue: issueForVariants,
                    us,
                    session: props.session,
                  })}
                </Box>
              ) : null}

              {coverAttribution ? <Box>{coverAttribution}</Box> : null}
            </Box>

            <Box sx={{ minWidth: 0, width: "100%", display: "flex", flexDirection: "column", gap: 2, gridColumn: { lg: "2 / 3" }, gridRow: { lg: "1 / span 2" } }}>
              <IssueCoverGalleryClient
                us={us}
                issues={coverGalleryIssues}
                activeFormat={selected.issue?.format ?? undefined}
                activeVariant={selected.issue?.variant ?? undefined}
                query={props.query}
              />
            </Box>
          </Box>

          {issueForVariants.addinfo && issueForVariants.addinfo !== "" ? (
            <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
              <Typography dangerouslySetInnerHTML={{ __html: sanitizeHtml(issueForVariants.addinfo) }} />
            </Paper>
          ) : null}
        </CardContent>
      </Box>
  );
}

function buildCoverGalleryIssues(issue: Issue): PreviewIssue[] {
  const variants = (issue.variants || []).filter(Boolean) as Issue[];
  const candidates = variants.length > 0 ? variants : [issue];
  const seenIssueKeys = new Set<string>();
  const gallery: PreviewIssue[] = [];

  for (const candidate of candidates) {
    const dedupeKey = [String(candidate.format || ""), String(candidate.variant || "")].join("|");
    if (seenIssueKeys.has(dedupeKey)) continue;
    seenIssueKeys.add(dedupeKey);

    gallery.push({
      ...(issue as unknown as PreviewIssue),
      ...(candidate as unknown as PreviewIssue),
      cover: candidate.cover || issue.cover,
    });
  }

  return gallery.length > 0 ? gallery : [issue as unknown as PreviewIssue];
}

function toIssueWithMockVariants(issue: Issue): Issue {
  if (!isMockMode) return issue;

  const cover = issue.cover?.url ? issue.cover : { url: "/nocover_simple.png" };
  const primaryVariant: Issue = {
    ...issue,
    cover,
    variants: null,
  };
  const secondaryVariant: Issue = {
    ...issue,
    variant: issue.variant && issue.variant !== "" ? `${issue.variant}-2` : "B",
    cover,
    variants: null,
  };

  return {
    ...issue,
    variants: [primaryVariant, secondaryVariant],
  };
}
