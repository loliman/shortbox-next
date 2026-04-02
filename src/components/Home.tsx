import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import HomeFeedClient from "./HomeFeedClient";
import SortContainer from "./SortContainer";
import type { PreviewIssue } from "./issue-preview/utils/issuePreviewUtils";
import { getIssueLabel, getIssueUrl } from "../lib/routes/issue-presentation";
import type { SessionData } from "../types/session";
import type { LayoutRouteData, RouteQuery } from "../types/route-ui";
import type { ListingQuery } from "../util/listingQuery";

const HOME_SEO_SUMMARY =
  "Shortbox listet alle deutschen Marvel Veröffentlichungen detailliert auf und ordnet diese den entsprechenden US Geschichten zu. Angefangen ueber Geschichten der bekanntesten Superhelden Spider-Man, Deadpool, den X-Men oder den Avengers oder unbekannteren Helden wie Moon Knight und den New Mutants, ueber Comics zum Marvel Cinematic Universe mit Captain America, Captain Marvel und Iron Man bis hin zu Western-Comics, Horror-Comics und Kinder-Comics wie den Gluecksbaerchis oder der Police Acadamy findet ihr hier alle Veroeffentlichungen in offiziellen Ausgaben, Raubkopien oder Fan-Comics.";

interface HomeProps {
  selected: LayoutRouteData["selected"];
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  session?: SessionData | null;
  initialFilterCount?: number | null;
  initialItems?: PreviewIssue[];
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  seoSnapshot?: {
    heading: string;
    items: PreviewIssue[];
  } | null;
}

export default function Home(props: Readonly<HomeProps>) {
  const snapshotItems = props.seoSnapshot?.items || [];
  return (
    <Stack spacing={3} sx={{ p: { xs: 1.5, sm: 2 } }}>
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
          title="All-New, All-Different Shortbox"
          subheader="Das deutsche Archiv für Marvel Comics"
          action={<SortContainer query={props.query as ListingQuery} selected={props.selected} us={props.us} />}
        />
        <Typography
          component="p"
          sx={{
            position: "absolute",
            width: 1,
            height: 1,
            p: 0,
            m: -1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {HOME_SEO_SUMMARY}
        </Typography>
      </Box>

      <HomeFeedClient
        selected={props.selected}
        us={props.us}
        query={props.query}
        session={props.session}
        initialItems={props.initialItems}
        initialHasMore={props.initialHasMore}
        initialNextCursor={props.initialNextCursor}
      />

      {props.seoSnapshot && snapshotItems.length > 0 ? (
        <Box
          component="section"
          aria-label={props.seoSnapshot.heading}
          sx={{
            position: "absolute",
            width: 1,
            height: 1,
            p: 0,
            m: -1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          <Typography component="h2">{props.seoSnapshot.heading}</Typography>
          <ul>
            {snapshotItems.slice(0, 30).map((item, idx) => (
              <li key={`seo-snapshot-${idx}-${item?.id || item?.number || "x"}`}>
                <a href={getIssueUrl(item, props.us)}>{getIssueLabel(item) || "Issue"}</a>
              </li>
            ))}
          </ul>
        </Box>
      ) : null}
    </Stack>
  );
}
