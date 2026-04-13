import React from "react";
import { notFound } from "next/navigation";
import QueryResult from "../generic/QueryResult";
import Box from "@mui/material/Box";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import SnackbarContent from "@mui/material/SnackbarContent";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
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
import { collectIssueArcs, getTodayLocalDate } from "./issue-details/utils/issueDetailsUtils";
import { generateComicGuideUrl, generateMarvelDbUrl } from "./issue-details/utils/externalLinks";
import { IssueCoverGalleryClient } from "./issue-details/IssueCoverGalleryClient";
import type { SessionData } from "../../types/session";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";
import type { IssueDetailsSlotComponent } from "./issue-details/slotTypes";
import DetailsHeaderActionBar from "./DetailsHeaderActionBar";
import { buildIssueBreadcrumbStructuredData, buildIssueComicStructuredData } from "@/src/lib/routes/structured-data";
import FilterSummaryBar from "../filter/FilterSummaryBar";
import { detailsBackgroundSx } from "./detailsBackgroundSx";

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

type IssueDetailsContentProps = {
  arcs: ReturnType<typeof collectIssueArcs>;
  BottomComponent?: IssueDetailsSlotComponent;
  coverAttribution: React.ReactNode;
  coverGalleryIssues: PreviewIssue[];
  detailsComponent: IssueDetailsSlotComponent;
  issue: Issue;
  query?: RouteQuery | null;
  selected: SelectedRoot;
  session?: SessionData | null;
  us: boolean;
};

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
  const today = getTodayLocalDate();
  const releaseDate = issueForVariants.releasedate ? new Date(issueForVariants.releasedate) : null;
  const breadcrumbJsonLd = buildIssueBreadcrumbStructuredData(issueForVariants, us ? "us" : "de");
  const comicIssueJsonLd = buildIssueComicStructuredData(issueForVariants, us ? "us" : "de");
  const coverGalleryIssues = buildCoverGalleryIssues(issueForVariants);
  const coverAttribution = buildCoverAttribution(issueForVariants, us);
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
      sx={{
        ...detailsBackgroundSx,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      {releaseDate && today < releaseDate ? (
        <SnackbarContent
          id="notVerifiedWarning"
          message="Diese Ausgabe ist noch nicht im Handel erhältlich und noch nicht vorab verifiziert worden. Die angezeigten Informationen weichen gegebenenfalls von den tatsächlichen Daten ab."
          sx={{
            width: { sm: "100%" },
              height: { sm: "auto" },
            borderRadius: { sm: 0 },
          }}
        />
      ) : null}
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
        <IssueDetailsMobileContent
          arcs={arcs}
          BottomComponent={BottomComponent}
          coverAttribution={coverAttribution}
          coverGalleryIssues={coverGalleryIssues}
          detailsComponent={DetailsComponent}
          issue={issueForVariants}
          query={props.query}
          selected={selected}
          session={props.session}
          us={us}
        />

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
            <IssueDetailsPrimaryColumn
              BottomComponent={BottomComponent}
              detailsComponent={DetailsComponent}
              issue={issueForVariants}
              query={props.query}
              selected={selected}
              session={props.session}
              us={us}
            />
          </Box>

          <Box
            sx={{
              ...desktopColumnScrollSx,
              pl: 0.5,
            }}
          >
            <IssueDetailsSecondaryColumn
              arcs={arcs}
              coverAttribution={coverAttribution}
              coverGalleryIssues={coverGalleryIssues}
              detailsComponent={DetailsComponent}
              issue={issueForVariants}
              query={props.query}
              selected={selected}
              session={props.session}
              us={us}
            />
          </Box>
        </Box>
      </CardContent>
    </Box>
  );
}

function buildCoverAttribution(issue: Issue, us: boolean): React.ReactNode {
  const issueReference = (
    <IssueReferenceInline
      seriesLabel={generateLabel({ series: issue.series })}
      number={issue.number}
      legacy_number={issue.legacy_number}
    />
  );
  const comicGuideId = String(issue.comicguideid ?? "").trim();

  if (!us && comicGuideId !== "" && comicGuideId !== "0") {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.82, textAlign: "left" }}>
        {"Das Cover für "}
        <a
          href={generateComicGuideUrl(issue)}
          rel="noopener noreferrer nofollow"
          target="_blank"
        >
          {issueReference}
        </a>
        {" wird bereitgestellt vom "}
        <a href="https://www.comicguide.de" rel="noopener noreferrer nofollow" target="_blank">
          deutschen ComicGuide
        </a>
        {" und darf nicht ohne Genehmigung weiterverbreitet werden."}
      </Typography>
    );
  }

  if (!us) return null;

  return (
    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.82, textAlign: "left" }}>
      {"Informationen über "}
      <a
        href={generateMarvelDbUrl(issue)}
        rel="noopener noreferrer nofollow"
        target="_blank"
      >
        {issueReference}
      </a>
      {" werden bezogen aus der "}
      <a href="https://marvel.fandom.com" rel="noopener noreferrer nofollow" target="_blank">
        Marvel Database
      </a>
      {" und stehen unter der "}
      <a
        href="https://creativecommons.org/licenses/by/3.0/de/"
        rel="noopener noreferrer nofollow"
        target="_blank"
      >
        Creative Commons License 3.0
      </a>
      {"."} {"Die Informationen wurden aufbereitet und unter Umständen ergänzt."}
    </Typography>
  );
}

function renderAddInfo(issue: Issue): React.ReactNode {
  if (!issue.addinfo) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography dangerouslySetInnerHTML={{ __html: sanitizeHtml(issue.addinfo) }} />
    </Paper>
  );
}

function renderArcs(arcs: ReturnType<typeof collectIssueArcs>, us: boolean): React.ReactNode {
  if (arcs.length === 0) return null;

  return (
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
  );
}

function renderBottomSection(
  BottomComponent: IssueDetailsSlotComponent | undefined,
  issue: Issue,
  query: RouteQuery | null | undefined,
  session: SessionData | null | undefined,
  us: boolean
): React.ReactNode {
  if (!BottomComponent) return null;

  return (
    <Box sx={{ minWidth: 0, width: "100%", mt: 0 }}>
      <BottomComponent
        query={query}
        selected={issue}
        issue={issue}
        us={us}
        session={session}
      />
    </Box>
  );
}

function renderDetailsTable(
  issue: Issue,
  detailsComponent: IssueDetailsSlotComponent,
  query: RouteQuery | null | undefined,
  us: boolean,
  framed = true
): React.ReactNode {
  return (
    <Box sx={{ minWidth: 0 }}>
      <DetailsTable
        issue={issue}
        details={detailsComponent}
        query={query}
        us={us}
        framed={framed}
      />
    </Box>
  );
}

function renderVariantSection(
  issue: Issue,
  selected: SelectedRoot,
  session: SessionData | null | undefined,
  us: boolean
): React.ReactNode {
  return (
    <Box sx={{ minWidth: 0 }}>
      <IssueVariants
        us={us}
        issue={issue as unknown as VariantIssue}
        activeFormat={selected.issue?.format ?? undefined}
        activeVariant={selected.issue?.variant ?? undefined}
        session={session}
      />
    </Box>
  );
}

function renderCoverGallery(
  coverGalleryIssues: PreviewIssue[],
  query: RouteQuery | null | undefined,
  selected: SelectedRoot,
  us: boolean,
  embedded = false
): React.ReactNode {
  return (
    <Box sx={{ minWidth: 0 }}>
      <IssueCoverGalleryClient
        us={us}
        issues={coverGalleryIssues}
        activeFormat={selected.issue?.format ?? undefined}
        activeVariant={selected.issue?.variant ?? undefined}
        query={query}
        embedded={embedded}
      />
    </Box>
  );
}

function renderIssueSummaryCard(
  coverGalleryIssues: PreviewIssue[],
  issue: Issue,
  detailsComponent: IssueDetailsSlotComponent,
  query: RouteQuery | null | undefined,
  selected: SelectedRoot,
  us: boolean
): React.ReactNode {
  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      {renderCoverGallery(coverGalleryIssues, query, selected, us, true)}
      <Divider />
      {renderDetailsTable(issue, detailsComponent, query, us, false)}
    </Paper>
  );
}

function IssueDetailsMobileContent(props: Readonly<IssueDetailsContentProps>) {
  return (
    <Box sx={{ display: { xs: "flex", lg: "none" }, flexDirection: "column", gap: 2 }}>
      {renderVariantSection(props.issue, props.selected, props.session, props.us)}
      {renderAddInfo(props.issue)}
      {renderIssueSummaryCard(
        props.coverGalleryIssues,
        props.issue,
        props.detailsComponent,
        props.query,
        props.selected,
        props.us
      )}
      {renderArcs(props.arcs, props.us)}
      {renderBottomSection(props.BottomComponent, props.issue, props.query, props.session, props.us)}
      {props.coverAttribution ? <Box>{props.coverAttribution}</Box> : null}
    </Box>
  );
}

function IssueDetailsPrimaryColumn(
  props: Readonly<Omit<IssueDetailsContentProps, "arcs" | "coverAttribution" | "coverGalleryIssues">>
) {
  return (
    <>
      {renderVariantSection(props.issue, props.selected, props.session, props.us)}
      {renderAddInfo(props.issue)}
      {renderBottomSection(props.BottomComponent, props.issue, props.query, props.session, props.us)}
    </>
  );
}

function IssueDetailsSecondaryColumn(
  props: Readonly<IssueDetailsContentProps>
) {
  return (
    <>
      {renderIssueSummaryCard(
        props.coverGalleryIssues,
        props.issue,
        props.detailsComponent,
        props.query,
        props.selected,
        props.us
      )}
      {renderArcs(props.arcs, props.us)}
      {props.coverAttribution ? <Box>{props.coverAttribution}</Box> : null}
    </>
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
