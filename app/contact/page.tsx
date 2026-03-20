import Contact from "@/src/components/footer/Contact";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function ContactPage() {
  return <Contact routeContext={createAppRouteContext({})} />;
}
