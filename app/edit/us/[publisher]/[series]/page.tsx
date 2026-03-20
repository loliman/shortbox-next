import SeriesEdit from "@/src/components/restricted/edit/SeriesEdit";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function UsSeriesEditPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <SeriesEdit routeContext={createAppRouteContext({ params, searchParams, edit: true, us: true })} />;
}
