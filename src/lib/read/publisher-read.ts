import "server-only";

import { cache } from "react";
import { readPublisherDetailsQuery } from "./publisher-details-read";

const readPublisherDetailsCached = cache(async (us: boolean, publisher: string) =>
  readPublisherDetailsQuery({
    us,
    publisher,
  })
);

export async function readPublisherDetails(options: { us: boolean; publisher: string }) {
  return readPublisherDetailsCached(options.us, options.publisher);
}

export async function readPublisherEditData(
  options: { us: boolean; publisher: string }
): Promise<Record<string, unknown> | null> {
  const result = await readPublisherDetails({
    us: options.us,
    publisher: options.publisher,
  });

  return (result?.details as Record<string, unknown> | null) || null;
}
