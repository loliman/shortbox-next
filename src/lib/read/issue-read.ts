import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CHANGE_REQUESTS_CACHE_TAG } from "../cache-tags";
import {
  countChangeRequests as countIssueChangeRequests,
  readChangeRequests as readIssueChangeRequests,
} from "./change-requests-read";
import {
  readIssueDetails as readIssueDetailsQuery,
} from "./issue-details-read";
import { readIssueMetadataQuery } from "./issue-metadata-read";
import type { IssueSelectionInput } from "./issue-selection";

type IssueDetailsResult = Awaited<ReturnType<typeof readIssueDetailsQuery>>;
type IssueMetadataResult = Awaited<ReturnType<typeof readIssueMetadataQuery>>;
type IssueSelectionOptions = IssueSelectionInput;

const readIssueDetailsCached = cache(
  async (
    us: boolean,
    publisher: string,
    series: string,
    volume: number,
    startyear: number | undefined,
    number: string,
    format: string | undefined,
    variant: string | undefined
  ) =>
    readIssueDetailsQuery({
      us,
      publisher,
      series,
      volume,
      startyear,
      number,
      format,
      variant,
    })
);

const readIssueMetadataCached = cache(
  async (
    us: boolean,
    publisher: string,
    series: string,
    volume: number,
    startyear: number | undefined,
    number: string,
    format: string | undefined,
    variant: string | undefined
  ) =>
    readIssueMetadataQuery({
      us,
      publisher,
      series,
      volume,
      startyear,
      number,
      format,
      variant,
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
    Number(options.startyear || 0) || undefined,
    options.number,
    options.format || undefined,
    options.variant || undefined
  );
}

export async function readIssueMetadata(
  options: IssueSelectionOptions
): Promise<IssueMetadataResult> {
  return readIssueMetadataCached(
    options.us,
    options.publisher,
    options.series,
    options.volume,
    Number(options.startyear || 0) || undefined,
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
