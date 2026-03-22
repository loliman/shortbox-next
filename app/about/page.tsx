import type { Metadata } from "next";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
import About from "@/src/components/footer/About";
import { createStaticMetadata } from "@/src/lib/routes/metadata";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export const metadata: Metadata = createStaticMetadata(
  "Über Shortbox",
  "Informationen über Shortbox, das Projekt und den Hintergrund der Anwendung."
);

export default async function AboutPage() {
  const page = await resolveAppPage({ us: false, includeNavigation: false });

  return (
    <AppPageShell selected={page.selected} level={page.level} us={page.us}>
      <About />
    </AppPageShell>
  );
}
