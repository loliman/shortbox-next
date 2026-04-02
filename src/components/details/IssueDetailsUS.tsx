import IssueDetails from "./IssueDetails";
import { IssueDetailsUSBottom } from "./issue-details/us/IssueDetailsUSBottom";
import { IssueDetailsUSDetails } from "./issue-details/us/IssueDetailsUSDetails";
import type { SessionData } from "../../types/session";
import type { LayoutRouteData } from "../../types/route-ui";

interface IssueDetailsUSProps {
  selected: LayoutRouteData["selected"];
  level: LayoutRouteData["level"];
  us: boolean;
  query?: LayoutRouteData["query"];
  initialFilterCount?: number | null;
  initialIssue?: unknown;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  session?: SessionData | null;
}

export default function IssueDetailsUS(props: Readonly<IssueDetailsUSProps>) {
  return (
    <IssueDetails
      selected={props.selected}
      level={props.level}
      us={props.us}
      query={props.query}
      initialFilterCount={props.initialFilterCount}
      initialIssue={props.initialIssue}
      initialPublisherNodes={props.initialPublisherNodes}
      initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey}
      session={props.session}
      bottom={IssueDetailsUSBottom}
      details={IssueDetailsUSDetails}
      subheader
    />
  );
}
