import type { AppRouteContextValue } from "../../app/routeContext";
import { SeriesService } from "../../services/SeriesService";

export async function readSeriesDetails(options: {
  us: boolean;
  publisher: string;
  series: string;
  volume: number;
}) {
  return new SeriesService().getSeriesDetails({
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
