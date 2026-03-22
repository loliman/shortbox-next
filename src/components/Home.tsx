import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import HomeFeedClient from "./HomeFeedClient";
import type { PreviewIssue } from "./issue-preview/utils/issuePreviewUtils";
import type { SessionData } from "../app/session";
import type { LayoutRouteData, RouteQuery } from "../types/route-ui";

const HOME_SEO_SUMMARY =
  "Shortbox listet alle deutschen Marvel Veröffentlichungen detailliert auf und ordnet diese den entsprechenden US Geschichten zu.";

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
}

export default function Home(props: Readonly<HomeProps>) {
  return (
    <Stack spacing={3} sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Box>
        <Typography variant="h5">All-New, All-Different Shortbox</Typography>
        <Typography color="text.secondary">Das deutsche Archiv für Marvel Comics</Typography>
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
    </Stack>
  );
}
