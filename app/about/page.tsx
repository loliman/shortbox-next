import About from "@/src/components/footer/About";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function AboutPage() {
  return <About routeContext={createAppRouteContext({})} />;
}
