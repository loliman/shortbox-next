import type { Metadata } from "next";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
import Contact from "@/src/components/footer/Contact";
import { createStaticMetadata } from "@/src/lib/routes/metadata";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export const metadata: Metadata = createStaticMetadata(
  "Kontakt",
  "Kontaktinformationen, Fehlermeldungen und Unterstützung für Shortbox."
);

export default async function ContactPage() {
  const page = await resolveAppPage({ us: false, includeNavigation: false });

  return (
    <AppPageShell selected={page.selected} level={page.level} us={page.us}>
      <Contact />
    </AppPageShell>
  );
}
