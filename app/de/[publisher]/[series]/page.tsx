import SeriesDetails from "@/src/components/details/SeriesDetails";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function DeSeriesPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return (
    <SeriesDetails routeContext={createAppRouteContext({ params, searchParams, us: false })} />
  );
}
