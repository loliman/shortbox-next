import SeriesDetails from "@/src/components/details/SeriesDetails";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function UsSeriesPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return (
    <SeriesDetails routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, us: true })} />
  );
}
