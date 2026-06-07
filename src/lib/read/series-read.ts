import "server-only";

import { cache } from "react";
import { readSeriesDetailsQuery } from "./series-details-read";
import type { SeriesSelectionInput } from "./series-selection";
import type { RouteQuery } from "../../types/route-ui";

const readSeriesDetailsCached = cache(
  async (
    us: boolean,
    publisher: string,
    series: string,
    volume: number,
    startyear: number | undefined,
    filterStr: string | null
  ) =>
    readSeriesDetailsQuery({
      us,
      publisher,
      series,
      volume,
      startyear,
      query: filterStr ? { filter: filterStr } : null,
    })
);

export async function readSeriesDetails(
  options: SeriesSelectionInput & { query?: RouteQuery | null }
) {
  const startyear = Number(options.startyear ?? 0) || undefined;
  const filterStr = typeof options.query?.filter === "string" ? options.query.filter : null;
  return readSeriesDetailsCached(
    options.us,
    options.publisher,
    options.series,
    options.volume,
    startyear,
    filterStr
  );
}

export async function readSeriesEditData(
  options: SeriesSelectionInput
): Promise<Record<string, unknown> | null> {
  const result = await readSeriesDetails({
    us: options.us,
    publisher: options.publisher,
    series: options.series,
    volume: options.volume,
  });

  const details = result?.details;
  return details && typeof details === "object" && !Array.isArray(details) ? details : null;
}

