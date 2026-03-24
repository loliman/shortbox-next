import type { Metadata } from "next";
import StaticPageShell from "@/src/components/app-shell/StaticPageShell";
import Impress from "@/src/components/footer/Impress";
import { createStaticMetadata } from "@/src/lib/routes/metadata";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export const metadata: Metadata = createStaticMetadata(
  "Impressum",
  "Impressum und rechtliche Angaben zu Shortbox.",
  { canonical: "/impress" }
);

export default async function ImpressPage() {
  const page = await resolveAppPage({ us: false, includeNavigation: false });

  return (
    <StaticPageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
    >
      <Impress />
    </StaticPageShell>
  );
}
