import IssueDetails from "./IssueDetails";
import { IssueDetailsDEBottom } from "./issue-details/de/IssueDetailsDEBottom";
import { IssueDetailsDEDetails } from "./issue-details/de/IssueDetailsDEDetails";
import type { SessionData } from "../../app/session";
import type { LayoutRouteData } from "../../types/route-ui";

interface IssueDetailsDEProps {
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

export default function IssueDetailsDE(props: Readonly<IssueDetailsDEProps>) {
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
      bottom={<IssueDetailsDEBottom session={props.session} />}
      details={<IssueDetailsDEDetails />}
      subheader
    />
  );
}
