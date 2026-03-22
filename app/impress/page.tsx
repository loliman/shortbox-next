import type { Metadata } from "next";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
import Impress from "@/src/components/footer/Impress";
import { createStaticMetadata } from "@/src/lib/routes/metadata";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export const metadata: Metadata = createStaticMetadata(
  "Impressum",
  "Impressum und rechtliche Angaben zu Shortbox."
);

export default async function ImpressPage() {
  const page = await resolveAppPage({ us: false, includeNavigation: false });

  return (
    <AppPageShell selected={page.selected} level={page.level} us={page.us}>
      <Impress />
    </AppPageShell>
  );
}
