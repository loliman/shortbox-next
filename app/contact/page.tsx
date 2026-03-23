import type { Metadata } from "next";
import StaticPageShell from "@/src/components/app-shell/StaticPageShell";
import Contact from "@/src/components/footer/Contact";
import { createStaticMetadata } from "@/src/lib/routes/metadata";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createStaticMetadata(
  "Kontakt",
  "Kontaktinformationen, Fehlermeldungen und Unterstützung für Shortbox."
);

export default async function ContactPage() {
  const page = await resolveAppPage({ us: false, includeNavigation: false });

  return (
    <StaticPageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
    >
      <Contact />
    </StaticPageShell>
  );
}
