import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
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
