import type { AppRouteContextValue } from "../../app/routeContext";
import { PublisherService } from "../../services/PublisherService";
import { SeriesService } from "../../services/SeriesService";

export async function getInitialPublisherEditData(
  routeContext: AppRouteContextValue
): Promise<Record<string, unknown> | null> {
  const publisherName = routeContext.selected.publisher?.name;
  if (!publisherName) return null;

  const result = await new PublisherService().getPublisherDetails({
    us: routeContext.us,
    publisher: publisherName,
  });

  return (result?.details as Record<string, unknown> | null) || null;
}

export async function getInitialSeriesEditData(
  routeContext: AppRouteContextValue
): Promise<Record<string, unknown> | null> {
  const selectedSeries = routeContext.selected.series;
  if (!selectedSeries?.publisher?.name || !selectedSeries.title) return null;

  const result = await new SeriesService().getSeriesDetails({
    us: routeContext.us,
    publisher: selectedSeries.publisher.name,
    series: selectedSeries.title,
    volume: Number(selectedSeries.volume || 0),
  });

  return (result?.details as Record<string, unknown> | null) || null;
}
