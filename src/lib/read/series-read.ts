import type { AppRouteContextValue } from "../../app/routeContext";
import { readSeriesDetailsQuery } from "./series-details-read";

export async function readSeriesDetails(options: {
  us: boolean;
  publisher: string;
  series: string;
  volume: number;
}) {
  return readSeriesDetailsQuery({
    us: options.us,
    publisher: options.publisher,
    series: options.series,
    volume: options.volume,
  });
}

export async function readSeriesEditData(
  routeContext: AppRouteContextValue
): Promise<Record<string, unknown> | null> {
  const selectedSeries = routeContext.selected.series;
  if (!selectedSeries?.publisher?.name || !selectedSeries.title) return null;

  const result = await readSeriesDetails({
    us: routeContext.us,
    publisher: selectedSeries.publisher.name,
    series: selectedSeries.title,
    volume: Number(selectedSeries.volume || 0),
  });

  return (result?.details as Record<string, unknown> | null) || null;
}
