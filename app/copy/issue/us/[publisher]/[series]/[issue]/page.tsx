import IssueCopy from "@/src/components/restricted/copy/IssueCopy";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function UsIssueCopyPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <IssueCopy routeContext={createAppRouteContext({ params, searchParams, us: true })} />;
}
