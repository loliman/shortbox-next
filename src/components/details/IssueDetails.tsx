"use client";

import { useRouter } from "next/navigation";
import Layout from "../Layout";
import QueryResult from "../generic/QueryResult";
import React from "react";
import Box from "@mui/material/Box";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import Collapse from "@mui/material/Collapse";
import { generateIssueSubHeader } from "../../util/issues";
import Typography from "@mui/material/Typography";
import { generateLabel } from "../../util/hierarchy";
import { getIssueUrl } from "../../util/issuePresentation";
import { isMockMode } from "../../app/mockMode";
import EditButton from "../restricted/EditButton";
import SnackbarContent from "@mui/material/SnackbarContent";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TitleLine from "../generic/TitleLine";
import { IssueReferenceInline } from "../generic/IssueNumberInline";
import type { Issue, SelectedRoot } from "../../types/domain";
import { sanitizeHtml } from "../../util/sanitizeHtml";
import { StoryArcChips } from "./issue-details/StoryArcChips";
import { IssueCover } from "./issue-details/IssueCover";
import { IssueVariants } from "./issue-details/variants/IssueVariants";
import type { VariantIssue } from "./issue-details/variants/types";
import { IssueDetailsPreview } from "./issue-details/preview/IssueDetailsPreview";
import { DetailsTable } from "./issue-details/DetailsTable";
import type { PreviewIssue } from "../issue-preview/utils/issuePreviewUtils";
import { collectIssueArcs, getTodayLocalDate } from "./issue-details/utils/issueDetailsUtils";
import { generateComicGuideUrl, generateMarvelDbUrl } from "./issue-details/utils/externalLinks";
import { buildRouteHref } from "../generic/routeHref";
import type { AppRouteContextValue } from "../../app/routeContext";

export {
  AppearanceList,
  Contains,
  ContainsTitleDetailed,
  ContainsTitleSimple,
  IndividualList,
  toChipList,
} from "./issue-details/contains";
export { toIsbn10, toIsbn13, toShortboxDate } from "./issue-details/utils/issueMetaFormatters";
export { DetailsRow } from "./issue-details/DetailsRow";

interface IssueDetailsProps {
  routeContext: AppRouteContextValue;
  selected?: SelectedRoot;
  level?: string;
  us?: boolean;
  appIsLoading?: boolean;
  session?: unknown;
  subheader?: boolean;
  details?: React.ReactElement;
  bottom?: React.ReactElement;
  compactLayout?: boolean;
  isPhone?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
  query?: Record<string, unknown> | null;
  [key: string]: unknown;
}

function IssueDetails(props: IssueDetailsProps) {
  const selected = props.selected || { us: Boolean(props.us) };
  const us = Boolean(props.us);
  const details = props.details || <React.Fragment />;
  const compactLayout =
    props.compactLayout ?? Boolean(props.isPhone || (props.isTablet && !props.isTabletLandscape));
  const [coverExpanded, setCoverExpanded] = React.useState(true);
  const [loadedIssue, setLoadedIssue] = React.useState<Issue | null>(null);
  const [loading, setLoading] = React.useState(Boolean(selected.issue));
  const [error, setError] = React.useState<unknown>(null);
  const loadedIssueIdentityKey = React.useMemo(
    () =>
      [
        us ? "us" : "de",
        selected.issue?.series?.publisher?.name || "",
        selected.issue?.series?.title || "",
        selected.issue?.series?.volume || "",
        selected.issue?.number || "",
        selected.issue?.format || "",
        selected.issue?.variant || "",
      ].join("|"),
    [
      selected.issue?.format,
      selected.issue?.number,
      selected.issue?.series?.publisher?.name,
      selected.issue?.series?.title,
      selected.issue?.series?.volume,
      selected.issue?.variant,
      us,
    ]
  );
  const issueForVariants = loadedIssue ? toIssueWithMockVariants(loadedIssue) : null;
  const coverGalleryIssues = React.useMemo(
    () => (issueForVariants ? buildCoverGalleryIssues(issueForVariants) : []),
    [issueForVariants]
  );

  React.useEffect(() => {
    if (!selected.issue?.series?.publisher?.name || !selected.issue?.series?.title || !selected.issue.number) {
      setLoadedIssue(null);
      setLoading(false);
      setError(null);
      return;
    }

    const params = new URLSearchParams({
      locale: us ? "us" : "de",
      publisher: selected.issue.series.publisher.name,
      series: selected.issue.series.title,
      volume: String(selected.issue.series.volume || 1),
      number: selected.issue.number,
    });

    if (selected.issue.format) params.set("format", selected.issue.format);
    if (selected.issue.variant) params.set("variant", selected.issue.variant);

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch(`/api/public-issue?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Issue request failed: ${response.status}`);
        return (await response.json()) as { item?: Issue | null };
      })
      .then((payload) => {
        if (cancelled) return;
        setLoadedIssue((payload.item || null) as Issue | null);
      })
      .catch((nextError) => {
        if (cancelled) return;
        setLoadedIssue(null);
        setError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    selected.issue?.number,
    selected.issue?.format,
    selected.issue?.variant,
    selected.issue?.series?.title,
    selected.issue?.series?.volume,
    selected.issue?.series?.publisher?.name,
    us,
  ]);

  if (loading && !loadedIssue) {
    return (
      <Layout routeContext={props.routeContext}>
        <Box className="data-fade">
          <QueryResult
            data={undefined}
            loading={true}
            selected={selected}
            placeholder={<IssueDetailsPreview />}
            placeholderCount={1}
          />
        </Box>
      </Layout>
    );
  }

  if (error || !issueForVariants || !loadedIssue) {
    return (
      <Layout routeContext={props.routeContext}>
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
      </Layout>
    );
  }

  const arcs = collectIssueArcs(issueForVariants, us);
  const today = getTodayLocalDate();
  const releaseDate = issueForVariants.releasedate ? new Date(issueForVariants.releasedate) : null;
  const coverColumnWidth = "clamp(320px, 36vw, 480px)";
  const gridTemplateColumns = { xs: "1fr", lg: `minmax(0, 1fr) ${coverColumnWidth}` };
  const coverWidth = {
    xs: "100%",
    lg: coverColumnWidth,
  };
  const coverAttribution = !us && issueForVariants.comicguideid ? (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        opacity: 0.82,
        textAlign: "left",
      }}
    >
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
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        opacity: 0.82,
        textAlign: "left",
      }}
    >
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
    <Layout routeContext={props.routeContext}>
      <Box
        className="data-fade"
        key={loadedIssueIdentityKey || loadedIssue?.id || "issue-details"}
        sx={{ width: "100%", display: "flex", flexDirection: "column" }}
      >
        {!us && !loadedIssue.verified && releaseDate && today < releaseDate ? (
          <SnackbarContent
            id="notVerifiedWarning"
            message="Diese Ausgabe ist noch nicht im Handel erhältlich und noch nicht vorab verifiziert worden.
                                        Die angezeigten Informationen weichen gegebenenfalls von den tatsächlichen Daten ab."
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
              <EditButton
                item={loadedIssue}
                level={props.level}
                us={props.us}
                routeContext={props.routeContext}
              />
            </Box>
          }
        />

        <CardContent sx={{ pt: 1 }}>
          {arcs.length > 0 ? (
            <Box
              sx={{
                pb: 1.5,
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

          <Box sx={{ pb: 5 }}>
            <IssueVariants
              us={us}
              issue={issueForVariants as unknown as VariantIssue}
              activeFormat={selected.issue?.format ?? undefined}
              activeVariant={selected.issue?.variant ?? undefined}
              session={props.session}
            />
          </Box>

          <Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns,
                gap: 2,
                alignItems: "start",
                width: "100%",
              }}
            >
              {compactLayout ? (
                <Box sx={{ minWidth: 0, width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: { xs: "center", lg: "flex-end" },
                      minWidth: 0,
                      justifySelf: { xs: "stretch", lg: "end" },
                    }}
                  >
                    <Box sx={{ display: { xs: "none", lg: "block" } }}>
                      <Box
                        sx={{
                          width: coverWidth,
                          maxWidth: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-start",
                          alignItems: "stretch",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "flex-start",
                          }}
                        >
                            <IssueCoverGallery
                              us={us}
                              issues={coverGalleryIssues}
                              activeFormat={selected.issue?.format ?? undefined}
                              activeVariant={selected.issue?.variant ?? undefined}
                              query={props.query}
                              session={props.session}
                            />
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ display: { xs: "block", lg: "none" }, width: "100%" }}>
                      <Box sx={{ width: coverWidth, maxWidth: "100%", mx: "auto", position: "relative" }}>
                        <IconButton
                          size="small"
                          aria-label={coverExpanded ? "Cover einklappen" : "Cover ausklappen"}
                          onClick={(event) => {
                            event.stopPropagation();
                            setCoverExpanded((prev) => !prev);
                          }}
                          sx={{
                            position: "absolute",
                            top: 1,
                            right: 2,
                            zIndex: 2,
                            color: "common.white",
                            p: 0.25,
                            "&:hover": { bgcolor: "transparent" },
                            transform: coverExpanded ? "rotate(45deg)" : "rotate(0deg)",
                            transition: "transform 180ms ease",
                          }}
                        >
                          <AddIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                        <Collapse
                          in={coverExpanded}
                          collapsedSize="25px"
                          sx={{
                            borderRadius: (theme) => `${Number(theme.shape.borderRadius) || 12}px`,
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              width: "100%",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "flex-start",
                              alignItems: "stretch",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "flex-start",
                              }}
                            >
                              <IssueCoverGallery
                                us={us}
                                issues={coverGalleryIssues}
                                activeFormat={selected.issue?.format ?? undefined}
                                activeVariant={selected.issue?.variant ?? undefined}
                                session={props.session}
                                query={props.query}
                              />
                            </Box>
                          </Box>
                        </Collapse>
                      </Box>
                    </Box>
                  </Box>

                  <DetailsTable
                    issue={issueForVariants}
                    details={details}
                    query={props.query}
                    us={us}
                  />

                  {props.bottom ? (
                    <Box sx={{ minWidth: 0, width: "100%", mt: 0 }}>
                        {React.cloneElement(props.bottom as React.ReactElement<any>, {
                        query: props.query,
                        selected: issueForVariants,
                        issue: issueForVariants,
                        us: us,
                      })}
                    </Box>
                  ) : null}

                  {coverAttribution ? <Box>{coverAttribution}</Box> : null}
                </Box>
              ) : (
                <React.Fragment>
                  <Box sx={{ minWidth: 0, width: "100%" }}>
                    {props.bottom ? (
                      <Box sx={{ minWidth: 0, width: "100%", mt: 0 }}>
                        {React.cloneElement(props.bottom as React.ReactElement<any>, {
                          query: props.query,
                          selected: issueForVariants,
                          issue: issueForVariants,
                          us: us,
                        })}
                      </Box>
                    ) : null}
                  </Box>

                  <Box sx={{ minWidth: 0, width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: { xs: "center", lg: "flex-end" },
                        minWidth: 0,
                        justifySelf: { xs: "stretch", lg: "end" },
                        gridColumn: { lg: "2 / 3" },
                        gridRow: { lg: "1" },
                      }}
                    >
                      <Box sx={{ display: { xs: "none", lg: "block" } }}>
                        <Box
                          sx={{
                            width: coverWidth,
                            maxWidth: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-start",
                            alignItems: "stretch",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "flex-start",
                            }}
                          >
                            <IssueCoverGallery
                              us={us}
                              issues={coverGalleryIssues}
                              activeFormat={selected.issue?.format ?? undefined}
                              activeVariant={selected.issue?.variant ?? undefined}
                              query={props.query}
                              session={props.session}
                            />
                          </Box>
                        </Box>
                      </Box>

                      <Box sx={{ display: { xs: "block", lg: "none" }, width: "100%" }}>
                        <Box sx={{ width: coverWidth, maxWidth: "100%", mx: "auto", position: "relative" }}>
                          <IconButton
                            size="small"
                            aria-label={coverExpanded ? "Cover einklappen" : "Cover ausklappen"}
                            onClick={(event) => {
                              event.stopPropagation();
                              setCoverExpanded((prev) => !prev);
                            }}
                            sx={{
                              position: "absolute",
                              top: 1,
                              right: 2,
                              zIndex: 2,
                              color: "common.white",
                              p: 0.25,
                              "&:hover": { bgcolor: "transparent" },
                              transform: coverExpanded ? "rotate(45deg)" : "rotate(0deg)",
                              transition: "transform 180ms ease",
                            }}
                          >
                            <AddIcon sx={{ fontSize: 20 }} />
                          </IconButton>
                          <Collapse
                            in={coverExpanded}
                            collapsedSize="25px"
                            sx={{
                              borderRadius: (theme) => `${Number(theme.shape.borderRadius) || 12}px`,
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-start",
                                alignItems: "stretch",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "flex-start",
                                }}
                              >
                                <IssueCoverGallery
                                  us={us}
                                  issues={coverGalleryIssues}
                                  activeFormat={selected.issue?.format ?? undefined}
                                  activeVariant={selected.issue?.variant ?? undefined}
                                  session={props.session}
                                  query={props.query}
                                />
                              </Box>
                            </Box>
                          </Collapse>
                        </Box>
                      </Box>
                    </Box>

                    <DetailsTable
                      issue={issueForVariants}
                      details={details}
                      query={props.query}
                      us={us}
                    />

                    {coverAttribution ? <Box>{coverAttribution}</Box> : null}
                  </Box>
                </React.Fragment>
              )}
            </Box>

            {issueForVariants.addinfo && issueForVariants.addinfo !== "" ? (
              <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                <Typography
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(issueForVariants.addinfo),
                  }}
                />
              </Paper>
            ) : null}
          </Box>
        </CardContent>
      </Box>
    </Layout>
  );
}

function IssueCoverGallery(props: {
  us: boolean;
  issues: PreviewIssue[];
  activeFormat?: string;
  activeVariant?: string;
  query?: Record<string, unknown> | null;
  session: unknown;
}) {
  const router = useRouter();
  const maxIndex = Math.max(0, props.issues.length - 1);
  const activeIssueKey = getIssueVariantKey({
    format: props.activeFormat ?? null,
    variant: props.activeVariant ?? null,
  });
  const activeIndex = React.useMemo(() => {
    const idx = props.issues.findIndex((item) => getIssueVariantKey(item) === activeIssueKey);
    return idx >= 0 ? idx : 0;
  }, [activeIssueKey, props.issues]);
  const activeIssue = props.issues[activeIndex] || props.issues[0];

  if (!activeIssue) return null;

  return (
    <Box sx={{ position: "relative", width: "100%", paddingTop: "150%" }}>
      <Box sx={{ position: "absolute", inset: 0 }}>
        <IssueCover us={props.us} issue={activeIssue} />
      </Box>

      {props.issues.length > 1 ? (
        <React.Fragment>
          {activeIndex > 0 ? (
            <IconButton
              aria-label="Vorheriges Cover"
              onClick={(event) => {
                event.stopPropagation();
                const prevIssue = props.issues[Math.max(0, activeIndex - 1)];
                if (!prevIssue) return;
                router.push(buildRouteHref(getIssueUrl(prevIssue, props.us), props.query));
              }}
              sx={coverGalleryArrowSx("left")}
            >
              <ChevronLeftIcon />
            </IconButton>
          ) : null}

          {activeIndex < maxIndex ? (
            <IconButton
              aria-label="Nächstes Cover"
              onClick={(event) => {
                event.stopPropagation();
                const nextIssue = props.issues[Math.min(maxIndex, activeIndex + 1)];
                if (!nextIssue) return;
                router.push(buildRouteHref(getIssueUrl(nextIssue, props.us), props.query));
              }}
              sx={coverGalleryArrowSx("right")}
            >
              <ChevronRightIcon />
            </IconButton>
          ) : null}
        </React.Fragment>
      ) : null}
    </Box>
  );
}

function coverGalleryArrowSx(side: "left" | "right") {
  return {
    position: "absolute",
    top: "50%",
    [side]: 8,
    transform: "translateY(-50%)",
    zIndex: 2,
    color: "common.white",
    bgcolor: "rgba(0,0,0,0.44)",
    border: "1px solid rgba(255,255,255,0.35)",
    width: 34,
    height: 34,
    "&:hover": {
      bgcolor: "rgba(0,0,0,0.6)",
    },
  };
}

function getIssueVariantKey(issue: { format?: string | null; variant?: string | null }): string {
  return [String(issue.format || "").trim(), String(issue.variant || "").trim()].join("|");
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

export default IssueDetails;
