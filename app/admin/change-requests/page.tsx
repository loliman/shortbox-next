import ChangeRequests from "@/src/components/admin/ChangeRequests";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function ChangeRequestsPage() {
  return <ChangeRequests routeContext={createAppRouteContext({})} />;
}
