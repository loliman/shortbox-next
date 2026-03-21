import type { AppRouteContextValue } from "../../app/routeContext";
import { IssueService } from "../../services/IssueService";

type IssueDetailsResult = Awaited<ReturnType<IssueService["getIssueDetails"]>>;

export async function getInitialIssueFromRouteContext(
  routeContext: AppRouteContextValue
): Promise<IssueDetailsResult> {
  const selectedIssue = routeContext.selected.issue;

  if (!selectedIssue?.series?.publisher?.name || !selectedIssue?.series?.title || !selectedIssue.number) {
    return null;
  }

  return new IssueService().getIssueDetails({
    us: Boolean(routeContext.selected.us),
    publisher: selectedIssue.series.publisher.name,
    series: selectedIssue.series.title,
    volume: Number(selectedIssue.series.volume || 0),
    number: selectedIssue.number,
    format: selectedIssue.format || undefined,
    variant: selectedIssue.variant || undefined,
  });
}
