import "server-only";

import { cache } from "react";
import { readPublisherDetailsQuery } from "./publisher-details-read";
import type { RouteQuery } from "../../types/route-ui";

const readPublisherDetailsCached = cache(
  async (us: boolean, publisher: string, filterStr: string | null) =>
    readPublisherDetailsQuery({
      us,
      publisher,
      query: filterStr ? { filter: filterStr } : null,
    })
);

export async function readPublisherDetails(options: {
  us: boolean;
  publisher: string;
  query?: RouteQuery | null;
}) {
  const filterStr = typeof options.query?.filter === "string" ? options.query.filter : null;
  return readPublisherDetailsCached(options.us, options.publisher, filterStr);
}

export async function readPublisherEditData(
  options: { us: boolean; publisher: string }
): Promise<Record<string, unknown> | null> {
  const result = await readPublisherDetails({
    us: options.us,
    publisher: options.publisher,
  });

  return (result?.details as Record<string, unknown> | null) ?? null;
}

