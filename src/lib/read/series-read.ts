import "server-only";

import { cache } from "react";
import { readSeriesDetailsQuery } from "./series-details-read";

const readSeriesDetailsCached = cache(
  async (us: boolean, publisher: string, series: string, volume: number) =>
    readSeriesDetailsQuery({
      us,
      publisher,
      series,
      volume,
    })
);

export async function readSeriesDetails(options: {
  us: boolean;
  publisher: string;
  series: string;
  volume: number;
}) {
  return readSeriesDetailsCached(options.us, options.publisher, options.series, options.volume);
}

export async function readSeriesEditData(
  options: {
    us: boolean;
    publisher: string;
    series: string;
    volume: number;
  }
): Promise<Record<string, unknown> | null> {
  const result = await readSeriesDetails({
    us: options.us,
    publisher: options.publisher,
    series: options.series,
    volume: options.volume,
  });

  return (result?.details as Record<string, unknown> | null) || null;
}
