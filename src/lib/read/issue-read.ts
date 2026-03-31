import "server-only";

import { unstable_cache } from "next/cache";
import { CHANGE_REQUESTS_CACHE_TAG } from "../cache-tags";
import {
  countChangeRequests as countIssueChangeRequests,
  readChangeRequests as readIssueChangeRequests,
} from "./change-requests-read";
import {
  readIssueDetails as readIssueDetailsQuery,
} from "./issue-details-read";
import type { IssueSelectionInput } from "./issue-selection";

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

export async function readChangeRequests(options?: {
  order?: string | null;
  direction?: string | null;
}) {
  return readIssueChangeRequests({
    order: options?.order || undefined,
    direction: options?.direction || undefined,
  });
}

const countChangeRequestsCached = unstable_cache(
  async () => countIssueChangeRequests(),
  ["change-requests-count"],
  {
    revalidate: 300,
    tags: [CHANGE_REQUESTS_CACHE_TAG],
  }
);

export async function countChangeRequests() {
  return countChangeRequestsCached();
}
