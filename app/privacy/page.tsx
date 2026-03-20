import Privacy from "@/src/components/footer/Privacy";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function PrivacyPage() {
  return <Privacy routeContext={createAppRouteContext({})} />;
}
