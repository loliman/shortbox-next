import Impress from "@/src/components/footer/Impress";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function ImpressPage() {
  return <Impress routeContext={createAppRouteContext({})} />;
}
