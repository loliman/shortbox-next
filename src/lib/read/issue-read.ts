import type { AppRouteContextValue } from "../../app/routeContext";
import {
  countChangeRequests as countIssueChangeRequests,
  readChangeRequests as readIssueChangeRequests,
} from "./change-requests-read";
import {
  readIssueDetails as readIssueDetailsQuery,
  type IssueSelectionInput,
} from "./issue-details-read";

type IssueDetailsResult = Awaited<ReturnType<typeof readIssueDetailsQuery>>;
type IssueSelectionOptions = IssueSelectionInput;

export async function readIssueDetails(
  options: IssueSelectionOptions
): Promise<IssueDetailsResult> {
  return readIssueDetailsQuery({
    us: options.us,
    publisher: options.publisher,
    series: options.series,
    volume: options.volume,
    number: options.number,
    format: options.format || undefined,
    variant: options.variant || undefined,
  });
}

export async function readIssueDetailsFromRouteContext(
  routeContext: AppRouteContextValue
): Promise<IssueDetailsResult> {
  const selectedIssue = routeContext.selected.issue;

  if (!selectedIssue?.series?.publisher?.name || !selectedIssue?.series?.title || !selectedIssue.number) {
    return null;
  }

  return readIssueDetails({
    us: Boolean(routeContext.selected.us),
    publisher: selectedIssue.series.publisher.name,
    series: selectedIssue.series.title,
    volume: Number(selectedIssue.series.volume || 0),
    number: selectedIssue.number,
    format: selectedIssue.format || undefined,
    variant: selectedIssue.variant || undefined,
  });
}

export async function readChangeRequests(options?: {
  order?: string | null;
  direction?: string | null;
}) {
  return readIssueChangeRequests({
    order: options?.order || undefined,
    direction: options?.direction || undefined,
  });
}

export async function countChangeRequests() {
  return countIssueChangeRequests();
}
