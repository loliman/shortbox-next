import "server-only";

import { cache } from "react";
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

const readIssueDetailsCached = cache(
  async (
    us: boolean,
    publisher: string,
    series: string,
    volume: number,
    number: string,
    format?: string,
    variant?: string
  ): Promise<IssueDetailsResult> =>
    readIssueDetailsQuery({
      us,
      publisher,
      series,
      volume,
      number,
      format: format || undefined,
      variant: variant || undefined,
    })
);

export async function readIssueDetails(
  options: IssueSelectionOptions
): Promise<IssueDetailsResult> {
  return readIssueDetailsCached(
    options.us,
    options.publisher,
    options.series,
    options.volume,
    options.number,
    options.format || undefined,
    options.variant || undefined
  );
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
