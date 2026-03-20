import IssueEdit from "@/src/components/restricted/edit/IssueEdit";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function DeIssueVariantEditPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <IssueEdit routeContext={createAppRouteContext({ params, searchParams, edit: true, us: false })} />;
}
