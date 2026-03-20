import SeriesCreate from "@/src/components/restricted/create/SeriesCreate";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function SeriesCreatePage() {
  return <SeriesCreate routeContext={createAppRouteContext({ create: true })} />;
}
