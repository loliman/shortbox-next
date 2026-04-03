import React from "react";
import { notFound } from "next/navigation";
import QueryResult from "../generic/QueryResult";
import Box from "@mui/material/Box";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { generateIssueSubHeader } from "../../util/issues";
import { generateLabel } from "../../lib/routes/hierarchy";
import { isMockMode } from "../../app/mockMode";
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
import { collectIssueArcs } from "./issue-details/utils/issueDetailsUtils";
import { generateComicGuideUrl, generateMarvelDbUrl } from "./issue-details/utils/externalLinks";
import { IssueCoverGalleryClient } from "./issue-details/IssueCoverGalleryClient";
import type { SessionData } from "../../types/session";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";
import type { IssueDetailsSlotComponent } from "./issue-details/slotTypes";
import DetailsHeaderActionBar from "./DetailsHeaderActionBar";
import { buildIssueBreadcrumbStructuredData, buildIssueComicStructuredData } from "@/src/lib/routes/structured-data";
import FilterSummaryBar from "../filter/FilterSummaryBar";

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
  details?: IssueDetailsSlotComponent;
  bottom?: IssueDetailsSlotComponent;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
}

export default function IssueDetails(props: Readonly<IssueDetailsProps>) {
  const selected = props.selected;
  const us = Boolean(props.us);
  const DetailsComponent = props.details ?? (() => null);
  const BottomComponent = props.bottom;
  const loadedIssue = (props.initialIssue as Issue | null | undefined) ?? null;
  const loading = false;
  const error = null;
  const issueForVariants = loadedIssue ? toIssueWithMockVariants(loadedIssue) : null;
  if (!loadedIssue || !issueForVariants) notFound();

  if (loading && !loadedIssue) {
    return (
      <Box>
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
      <Box>
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
  const breadcrumbJsonLd = buildIssueBreadcrumbStructuredData(issueForVariants, us ? "us" : "de");
  const comicIssueJsonLd = buildIssueComicStructuredData(issueForVariants, us ? "us" : "de");
  const coverGalleryIssues = buildCoverGalleryIssues(issueForVariants);
  const hasComicGuideAttribution =
    !us &&
    issueForVariants.comicguideid !== null &&
    issueForVariants.comicguideid !== undefined &&
    String(issueForVariants.comicguideid).trim() !== "" &&
    String(issueForVariants.comicguideid) !== "0";
  let coverAttribution: React.ReactNode = null;
  if (hasComicGuideAttribution) {
    coverAttribution = (
      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.82, textAlign: "left" }}>
        Das Cover für&nbsp;
        <a
          href={generateComicGuideUrl(issueForVariants)}
          rel="noopener noreferrer nofollow"
          target="_blank"
        >
          <IssueReferenceInline
            seriesLabel={generateLabel({ series: issueForVariants.series })}
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
    );
  } else if (us) {
    coverAttribution = (
      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.82, textAlign: "left" }}>
        Informationen über&nbsp;
        <a
          href={generateMarvelDbUrl(issueForVariants)}
          rel="noopener noreferrer nofollow"
          target="_blank"
        >
          <IssueReferenceInline
            seriesLabel={generateLabel({ series: issueForVariants.series })}
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
    );
  }
  const desktopColumnScrollSx = {
    minWidth: 0,
    minHeight: 0,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    pt: 0.5,
    pb: 1,
    scrollbarGutter: "stable",
  } as const;

  return (
    <Box
      key={loadedIssue.id || "issue-details"}
      sx={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {breadcrumbJsonLd ? (
        <script
          key={`issue-breadcrumb-jsonld-${loadedIssue.id || issueForVariants.number || "issue"}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      ) : null}
      {comicIssueJsonLd ? (
        <script
          key={`issue-comic-jsonld-${loadedIssue.id || issueForVariants.number || "issue"}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(comicIssueJsonLd) }}
        />
      ) : null}
      <CardHeader
        sx={{
          "& .MuiCardHeader-action": {
            m: 0,
            alignSelf: "center",
          },
        }}
        title={
          <TitleLine
            title={
              <IssueReferenceInline
                seriesLabel={generateLabel({ series: loadedIssue.series })}
                number={loadedIssue.number}
                legacy_number={loadedIssue.legacy_number}
              />
            }
            session={props.session}
          />
        }
        subheader={props.subheader ? generateIssueSubHeader(loadedIssue) : ""}
        action={
          <DetailsHeaderActionBar
            id={loadedIssue.id ?? undefined}
            item={loadedIssue}
            query={props.query}
            selected={props.selected}
            session={props.session}
            level={props.level}
            us={props.us}
            showSort={false}
          />
        }
      />

      {props.query?.filter ? (
        <Box sx={{ px: 2, pb: 0.5 }}>
          <FilterSummaryBar
            query={props.query}
            us={props.us}
            selected={props.selected}
          />
        </Box>
      ) : null}

      <CardContent
        sx={{
          pt: 1,
          pb: 0,
          "&:last-child": {
            pb: 0,
          },
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: { xs: "visible", lg: "hidden" },
        }}
      >
        <Box sx={{ display: { xs: "flex", lg: "none" }, flexDirection: "column", gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <IssueVariants
              us={us}
              issue={issueForVariants as unknown as VariantIssue}
              activeFormat={selected.issue?.format ?? undefined}
              activeVariant={selected.issue?.variant ?? undefined}
              session={props.session}
            />
          </Box>

          {issueForVariants.addinfo && issueForVariants.addinfo !== "" ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography dangerouslySetInnerHTML={{ __html: sanitizeHtml(issueForVariants.addinfo) }} />
            </Paper>
          ) : null}

          <Box sx={{ minWidth: 0 }}>
            <IssueCoverGalleryClient
              us={us}
              issues={coverGalleryIssues}
              activeFormat={selected.issue?.format ?? undefined}
              activeVariant={selected.issue?.variant ?? undefined}
              query={props.query}
            />
          </Box>

          {arcs.length > 0 ? (
            <Box
              sx={{
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "nowrap",
                overflow: "hidden",
              }}
            >
              <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                <StoryArcChips arcs={arcs} us={us} inline />
              </Box>
            </Box>
          ) : null}

          <Box sx={{ minWidth: 0 }}>
            <DetailsTable
              issue={issueForVariants}
              details={DetailsComponent}
              query={props.query}
              us={us}
            />
          </Box>

          {BottomComponent ? (
            <Box sx={{ minWidth: 0, width: "100%", mt: 0 }}>
              <BottomComponent
                query={props.query}
                selected={issueForVariants}
                issue={issueForVariants}
                us={us}
                session={props.session}
              />
            </Box>
          ) : null}

          {coverAttribution ? <Box>{coverAttribution}</Box> : null}
        </Box>

        <Box
          sx={{
            display: { xs: "none", lg: "grid" },
            gridTemplateColumns: "minmax(0, 1fr) clamp(230px, 26vw, 345px)",
            gap: 2,
            alignItems: "stretch",
            width: "100%",
            flex: 1,
            height: "100%",
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              ...desktopColumnScrollSx,
              pr: 0.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <IssueVariants
                us={us}
                issue={issueForVariants as unknown as VariantIssue}
                activeFormat={selected.issue?.format ?? undefined}
                activeVariant={selected.issue?.variant ?? undefined}
                session={props.session}
              />
            </Box>

            {issueForVariants.addinfo && issueForVariants.addinfo !== "" ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography dangerouslySetInnerHTML={{ __html: sanitizeHtml(issueForVariants.addinfo) }} />
              </Paper>
            ) : null}

            {BottomComponent ? (
              <Box sx={{ minWidth: 0, width: "100%", mt: 0 }}>
                <BottomComponent
                  query={props.query}
                  selected={issueForVariants}
                  issue={issueForVariants}
                  us={us}
                  session={props.session}
                />
              </Box>
            ) : null}
          </Box>

          <Box
            sx={{
              ...desktopColumnScrollSx,
              pl: 0.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <IssueCoverGalleryClient
                us={us}
                issues={coverGalleryIssues}
                activeFormat={selected.issue?.format ?? undefined}
                activeVariant={selected.issue?.variant ?? undefined}
                query={props.query}
              />
            </Box>

            {arcs.length > 0 ? (
              <Box
                sx={{
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "nowrap",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                  <StoryArcChips arcs={arcs} us={us} inline />
                </Box>
              </Box>
            ) : null}

            <Box sx={{ minWidth: 0 }}>
              <DetailsTable
                issue={issueForVariants}
                details={DetailsComponent}
                query={props.query}
                us={us}
              />
            </Box>

            {coverAttribution ? <Box>{coverAttribution}</Box> : null}
          </Box>
        </Box>
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
    const dedupeKey = [candidate.format || "", candidate.variant || ""].join("|");
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
