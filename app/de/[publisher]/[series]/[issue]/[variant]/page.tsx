import IssueDetailsDE from "@/src/components/details/IssueDetailsDE";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function DeIssueVariantPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return (
    <IssueDetailsDE routeContext={createAppRouteContext({ params, searchParams, us: false })} />
  );
}
