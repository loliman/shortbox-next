import "server-only";

import { cache } from "react";
import { readSeriesDetailsQuery } from "./series-details-read";
import type { SeriesSelectionInput } from "./series-selection";

const readSeriesDetailsCached = cache(
  async (us: boolean, publisher: string, series: string, volume: number, startyear?: number) =>
    readSeriesDetailsQuery({
      us,
      publisher,
      series,
      volume,
      startyear,
    })
);

export async function readSeriesDetails(options: SeriesSelectionInput) {
  const startyear = Number(options.startyear ?? 0) || undefined;
  return readSeriesDetailsCached(
    options.us,
    options.publisher,
    options.series,
    options.volume,
    startyear
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

  return (result?.details as Record<string, unknown> | null) ?? null;
}
