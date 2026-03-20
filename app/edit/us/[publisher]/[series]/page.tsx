import SeriesEdit from "@/src/components/restricted/edit/SeriesEdit";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function UsSeriesEditPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return <SeriesEdit routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, edit: true, us: true })} />;
}
