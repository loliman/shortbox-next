import type { Metadata } from "next";
import StaticPageShell from "@/src/components/app-shell/StaticPageShell";
import Privacy from "@/src/components/footer/Privacy";
import { createStaticMetadata } from "@/src/lib/routes/metadata";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export const metadata: Metadata = createStaticMetadata(
  "Datenschutz",
  "Datenschutzerklärung von Shortbox.",
  { canonical: "/privacy" }
);

export default async function PrivacyPage() {
  const page = await resolveAppPage({ us: false, includeNavigation: false });

  return (
    <StaticPageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
    >
      <Privacy />
    </StaticPageShell>
  );
}
