import type { Metadata } from "next";
import StaticPageShell from "@/src/components/app-shell/StaticPageShell";
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
    <StaticPageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
    >
      <About />
    </StaticPageShell>
  );
}
