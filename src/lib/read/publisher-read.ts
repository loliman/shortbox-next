import type { AppRouteContextValue } from "../../app/routeContext";
import { PublisherService } from "../../services/PublisherService";

export async function readPublisherDetails(options: { us: boolean; publisher: string }) {
  return new PublisherService().getPublisherDetails({
    us: options.us,
    publisher: options.publisher,
  });
}

export async function readPublisherEditData(
  routeContext: AppRouteContextValue
): Promise<Record<string, unknown> | null> {
  const publisherName = routeContext.selected.publisher?.name;
  if (!publisherName) return null;

  const result = await readPublisherDetails({
    us: routeContext.us,
    publisher: publisherName,
  });

  return (result?.details as Record<string, unknown> | null) || null;
}
